import type { PrismaClient } from "@prisma/client";
import type { CarrierExecutionJob } from "@travel-quote/queue";
import type {
  ArtifactCollector,
  CarrierRunContext,
  HumanInterventionGateway
} from "@travel-quote/carrier-sdk";
import type { BrowserSession } from "@travel-quote/browser-core";
import type { TravelDestination, TravelQuoteRequest } from "@travel-quote/domain";
import { createLogger } from "@travel-quote/observability";
import { getAdapter, type AdapterRegistry } from "./registry.js";

export type CarrierExecutionProcessorOptions = {
  prisma: PrismaClient;
  registry: AdapterRegistry;
};

const noopArtifacts: ArtifactCollector = {
  collect: () => Promise.resolve("mock-artifact")
};

const noopIntervention: HumanInterventionGateway = {
  request: () => Promise.reject(new Error("Human intervention is not implemented in mock worker"))
};

const noopBrowser = {
  page: {},
  context: {},
  captureFailureArtifact: () => Promise.resolve(),
  close: () => Promise.resolve()
} as unknown as BrowserSession;

const asTravelDestination = (value: unknown): TravelDestination => value as TravelDestination;

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const sanitizeErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message.slice(0, 500) : "Unknown worker error";

export const createCarrierExecutionProcessor = ({
  prisma,
  registry
}: CarrierExecutionProcessorOptions) => {
  const logger = createLogger("worker.processor");

  return async (job: CarrierExecutionJob): Promise<void> => {
    const execution = await prisma.carrierExecution.findUnique({
      where: { id: job.carrierExecutionId },
      include: {
        carrier: true,
        quoteRequest: {
          include: {
            travelers: true
          }
        }
      }
    });

    if (!execution) {
      throw new Error(`Carrier execution not found: ${job.carrierExecutionId}`);
    }

    if (execution.status === "CANCELLED" || execution.quoteRequest.status === "CANCELLED") {
      logger.info({ carrierExecutionId: execution.id }, "Skipping cancelled carrier execution");
      return;
    }

    const adapter = getAdapter(registry, job.carrierSlug);
    const input: TravelQuoteRequest = {
      id: execution.quoteRequest.id,
      userId: execution.quoteRequest.userId,
      originCountry: execution.quoteRequest.originCountry,
      destination: asTravelDestination(execution.quoteRequest.destinationJson),
      departureDate: toDateOnly(execution.quoteRequest.departureDate),
      returnDate: toDateOnly(execution.quoteRequest.returnDate),
      travelers: execution.quoteRequest.travelers.map((traveler) => ({
        id: traveler.id,
        birthDate: toDateOnly(traveler.birthDate)
      })),
      tripPurpose: execution.quoteRequest.tripPurpose as TravelQuoteRequest["tripPurpose"],
      selectedCarrierIds: [execution.carrier.slug],
      createdAt: execution.quoteRequest.createdAt.toISOString()
    };
    const context: CarrierRunContext = {
      executionId: execution.id,
      logger,
      browser: noopBrowser,
      artifacts: noopArtifacts,
      cancellationSignal: new AbortController().signal,
      intervention: noopIntervention
    };

    await prisma.carrierExecution.update({
      where: { id: execution.id },
      data: {
        status: "STARTING",
        startedAt: new Date(),
        currentStep: "mock_adapter_start"
      }
    });

    const validation = await adapter.validateInput(input);

    if (!validation.valid) {
      await prisma.carrierExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED_FINAL",
          finishedAt: new Date(),
          errorCode: validation.errors[0]?.code ?? "INVALID_INPUT",
          errorMessageSanitized: validation.errors[0]?.message ?? "Invalid adapter input",
          currentStep: "mock_adapter_validate"
        }
      });
      await updateQuoteRequestAggregateStatus(prisma, execution.quoteRequestId);
      return;
    }

    try {
      await prisma.carrierExecution.update({
        where: { id: execution.id },
        data: {
          status: "READING_RESULTS",
          currentStep: "mock_adapter_run"
        }
      });

      const result = await adapter.run(context, input);

      await prisma.$transaction(async (tx) => {
        await tx.travelPlan.deleteMany({
          where: {
            carrierExecutionId: execution.id
          }
        });

        for (const plan of result.plans) {
          await tx.travelPlan.create({
            data: {
              carrierExecutionId: execution.id,
              carrierId: execution.carrierId,
              externalPlanId: plan.externalPlanId ?? null,
              planName: plan.planName,
              currency: plan.currency,
              totalPrice: plan.totalPrice,
              pricePerTraveler: plan.pricePerTraveler ?? null,
              validUntil: plan.validUntil ? new Date(plan.validUntil) : null,
              purchaseUrl: plan.purchaseUrl ?? null,
              rawResultReference: plan.rawResultReference ?? null,
              collectedAt: new Date(plan.collectedAt),
              coverages: {
                create: plan.coverages.map((coverage) => ({
                  code: coverage.code,
                  displayName: coverage.displayName,
                  amount: coverage.amount ?? null,
                  currency: coverage.currency ?? null,
                  included: coverage.included,
                  details: coverage.details ?? null
                }))
              }
            }
          });
        }

        await tx.carrierExecution.update({
          where: { id: execution.id },
          data: {
            status: "SUCCEEDED",
            finishedAt: new Date(),
            currentStep: "mock_adapter_complete",
            externalQuoteReference: result.externalQuoteReference ?? null
          }
        });
      });
    } catch (error) {
      await prisma.carrierExecution.update({
        where: { id: execution.id },
        data: {
          status: "FAILED_RETRYABLE",
          finishedAt: new Date(),
          errorCode: "UNKNOWN",
          errorMessageSanitized: sanitizeErrorMessage(error),
          currentStep: "mock_adapter_error"
        }
      });
    }

    await updateQuoteRequestAggregateStatus(prisma, execution.quoteRequestId);
  };
};

export const updateQuoteRequestAggregateStatus = async (
  prisma: PrismaClient,
  quoteRequestId: string
): Promise<void> => {
  const executions = await prisma.carrierExecution.findMany({
    where: { quoteRequestId }
  });

  if (executions.length === 0) {
    return;
  }

  const completedCount = executions.filter((execution) => execution.status === "SUCCEEDED").length;
  const terminalCount = executions.filter((execution) =>
    ["SUCCEEDED", "FAILED_FINAL", "FAILED_RETRYABLE", "CANCELLED"].includes(execution.status)
  ).length;

  if (executions.every((execution) => execution.status === "CANCELLED")) {
    await prisma.quoteRequest.update({
      where: { id: quoteRequestId },
      data: { status: "CANCELLED" }
    });
    return;
  }

  if (terminalCount === executions.length) {
    await prisma.quoteRequest.update({
      where: { id: quoteRequestId },
      data: {
        status:
          completedCount === executions.length
            ? "COMPLETED"
            : completedCount > 0
              ? "PARTIALLY_COMPLETED"
              : "FAILED"
      }
    });
    return;
  }

  await prisma.quoteRequest.update({
    where: { id: quoteRequestId },
    data: { status: "RUNNING" }
  });
};
