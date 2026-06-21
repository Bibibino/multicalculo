import type {
  Carrier,
  CarrierExecution,
  Coverage,
  Prisma,
  PrismaClient,
  QuoteRequest,
  Traveler,
  TravelPlan
} from "@prisma/client";
import { createQuoteRequestSchema, loginSchema, type CreateQuoteRequestInput } from "@travel-quote/domain";
import { createAccessToken, verifyPassword, type AuthUser } from "./auth.js";

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly code: string
  ) {
    super(message);
  }
}

export type QuoteJobPublisher = {
  publishCarrierExecution(input: {
    quoteRequestId: string;
    carrierExecutionId: string;
    carrierSlug: string;
  }): Promise<void>;
  cancelCarrierExecution?(carrierExecutionId: string): Promise<void>;
};

export const createNoopQuoteJobPublisher = (): QuoteJobPublisher => ({
  publishCarrierExecution: () => Promise.resolve()
});

export type AppPrismaClient = PrismaClient;

type QuoteRequestWithRelations = QuoteRequest & {
  travelers: Traveler[];
  executions: Array<
    CarrierExecution & {
      carrier: Carrier;
      plans: Array<TravelPlan & { coverages: Coverage[] }>;
    }
  >;
};

export type SerializedQuoteRequest = {
  id: string;
  userId: string;
  originCountry: string;
  destination: unknown;
  departureDate: string;
  returnDate: string;
  tripPurpose: string;
  status: string;
  travelers: Array<{ id: string; birthDate: string }>;
  executions: Array<{
    id: string;
    carrierId: string;
    carrierSlug: string;
    carrierName: string;
    status: string;
    attempt: number;
    errorCode: string | null;
    errorMessageSanitized: string | null;
    plansCount: number;
    plans: Array<{
      id: string;
      planName: string;
      currency: string;
      totalPrice: string;
      pricePerTraveler: string | null;
      externalPlanId: string | null;
      externalQuoteReference: string | null;
      collectedAt: string;
      coverages: Array<{
        code: string;
        displayName: string;
        amount: string | null;
        currency: string | null;
        included: boolean;
        details: string | null;
      }>;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
};

const toIsoDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const parseDateOnly = (value: string): Date => new Date(`${value}T00:00:00.000Z`);

const serializeQuoteRequest = (quoteRequest: QuoteRequestWithRelations): SerializedQuoteRequest => ({
  id: quoteRequest.id,
  userId: quoteRequest.userId,
  originCountry: quoteRequest.originCountry,
  destination: quoteRequest.destinationJson,
  departureDate: toIsoDateOnly(quoteRequest.departureDate),
  returnDate: toIsoDateOnly(quoteRequest.returnDate),
  tripPurpose: quoteRequest.tripPurpose,
  status: quoteRequest.status,
  travelers: quoteRequest.travelers.map((traveler) => ({
    id: traveler.id,
    birthDate: toIsoDateOnly(traveler.birthDate)
  })),
  executions: quoteRequest.executions.map((execution) => ({
    id: execution.id,
    carrierId: execution.carrierId,
    carrierSlug: execution.carrier.slug,
    carrierName: execution.carrier.name,
    status: execution.status,
    attempt: execution.attempt,
    errorCode: execution.errorCode,
    errorMessageSanitized: execution.errorMessageSanitized,
    plansCount: execution.plans.length,
    plans: execution.plans.map((plan) => ({
      id: plan.id,
      planName: plan.planName,
      currency: plan.currency,
      totalPrice: plan.totalPrice.toString(),
      pricePerTraveler: plan.pricePerTraveler?.toString() ?? null,
      externalPlanId: plan.externalPlanId,
      externalQuoteReference: execution.externalQuoteReference,
      collectedAt: plan.collectedAt.toISOString(),
      coverages: plan.coverages.map((coverage) => ({
        code: coverage.code,
        displayName: coverage.displayName,
        amount: coverage.amount?.toString() ?? null,
        currency: coverage.currency,
        included: coverage.included,
        details: coverage.details
      }))
    }))
  })),
  createdAt: quoteRequest.createdAt.toISOString(),
  updatedAt: quoteRequest.updatedAt.toISOString()
});

const quoteInclude = {
  travelers: true,
  executions: {
    include: {
      carrier: true,
      plans: {
        include: {
          coverages: true
        },
        orderBy: {
          totalPrice: "asc"
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  }
} satisfies Prisma.QuoteRequestInclude;

export const login = async (
  prisma: AppPrismaClient,
  rawInput: unknown
): Promise<{ accessToken: string; user: Pick<AuthUser, "id" | "name" | "role"> }> => {
  const input = loginSchema.parse(rawInput);
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user?.active || !user.passwordHash) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new ApiError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const authUser: AuthUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  return {
    accessToken: createAccessToken(authUser),
    user: {
      id: authUser.id,
      name: authUser.name,
      role: authUser.role
    }
  };
};

const resolveSelectedCarriers = async (
  prisma: Pick<AppPrismaClient, "carrier">,
  selectedCarrierIds: string[]
): Promise<Carrier[]> => {
  const carriers = await prisma.carrier.findMany({
    where: {
      slug: { in: selectedCarrierIds },
      enabled: true
    }
  });

  const foundSlugs = new Set(carriers.map((carrier) => carrier.slug));
  const missingCarrier = selectedCarrierIds.find((carrierId) => !foundSlugs.has(carrierId));

  if (missingCarrier) {
    throw new ApiError(400, `Carrier is not available: ${missingCarrier}`, "CARRIER_NOT_AVAILABLE");
  }

  return selectedCarrierIds.map((carrierId) => {
    const carrier = carriers.find((candidate) => candidate.slug === carrierId);

    if (!carrier) {
      throw new ApiError(400, `Carrier is not available: ${carrierId}`, "CARRIER_NOT_AVAILABLE");
    }

    return carrier;
  });
};

export const createQuoteRequest = async (
  prisma: AppPrismaClient,
  publisher: QuoteJobPublisher,
  user: AuthUser,
  rawInput: unknown
): Promise<SerializedQuoteRequest> => {
  const input: CreateQuoteRequestInput = createQuoteRequestSchema.parse(rawInput);

  const quoteRequest = await prisma.$transaction(async (tx) => {
    const carriers = await resolveSelectedCarriers(tx, input.selectedCarrierIds);
    const createdQuoteRequest = await tx.quoteRequest.create({
      data: {
        userId: user.id,
        originCountry: input.originCountry,
        destinationJson: input.destination,
        departureDate: parseDateOnly(input.departureDate),
        returnDate: parseDateOnly(input.returnDate),
        tripPurpose: input.tripPurpose,
        status: "QUEUED",
        travelers: {
          create: input.travelers.map((traveler) => ({
            birthDate: parseDateOnly(traveler.birthDate)
          }))
        },
        executions: {
          create: carriers.map((carrier) => ({
            carrierId: carrier.id,
            status: "QUEUED",
            attempt: 1,
            adapterVersion: carrier.adapterVersion
          }))
        }
      },
      include: quoteInclude
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        quoteRequestId: createdQuoteRequest.id,
        action: "QUOTE_REQUEST_CREATED",
        entityType: "QuoteRequest",
        entityId: createdQuoteRequest.id,
        metadataJson: {
          selectedCarrierIds: input.selectedCarrierIds
        }
      }
    });

    return createdQuoteRequest;
  });

  await Promise.all(
    quoteRequest.executions.map((execution) =>
      publisher.publishCarrierExecution({
        quoteRequestId: quoteRequest.id,
        carrierExecutionId: execution.id,
        carrierSlug: execution.carrier.slug
      })
    )
  );

  return serializeQuoteRequest(quoteRequest);
};

export const getQuoteRequest = async (
  prisma: AppPrismaClient,
  id: string
): Promise<SerializedQuoteRequest> => {
  const quoteRequest = await prisma.quoteRequest.findUnique({
    where: { id },
    include: quoteInclude
  });

  if (!quoteRequest) {
    throw new ApiError(404, "Quote request not found", "QUOTE_REQUEST_NOT_FOUND");
  }

  return serializeQuoteRequest(quoteRequest);
};

export const listQuoteRequests = async (
  prisma: AppPrismaClient,
  query: {
    status?: string;
    userId?: string;
    carrierId?: string;
    createdFrom?: string;
    createdTo?: string;
    limit?: number;
    offset?: number;
  }
): Promise<SerializedQuoteRequest[]> => {
  const quoteRequests = await prisma.quoteRequest.findMany({
    where: {
      ...(query.status ? { status: query.status as QuoteRequest["status"] } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.createdFrom || query.createdTo
        ? {
            createdAt: {
              ...(query.createdFrom ? { gte: parseDateOnly(query.createdFrom) } : {}),
              ...(query.createdTo ? { lte: new Date(`${query.createdTo}T23:59:59.999Z`) } : {})
            }
          }
        : {}),
      ...(query.carrierId
        ? {
            executions: {
              some: {
                carrier: {
                  slug: query.carrierId
                }
              }
            }
          }
        : {})
    },
    include: quoteInclude,
    orderBy: { createdAt: "desc" },
    take: query.limit ?? 50,
    skip: query.offset ?? 0
  });

  return quoteRequests.map(serializeQuoteRequest);
};

export const cancelQuoteRequest = async (
  prisma: AppPrismaClient,
  publisher: QuoteJobPublisher,
  user: AuthUser,
  id: string
): Promise<SerializedQuoteRequest> => {
  const cancellableExecutionIds: string[] = [];
  const quoteRequest = await prisma.$transaction(async (tx) => {
    const executionsToCancel = await tx.carrierExecution.findMany({
      where: {
        quoteRequestId: id,
        status: {
          in: ["PENDING", "QUEUED"]
        }
      },
      select: {
        id: true
      }
    });
    cancellableExecutionIds.push(...executionsToCancel.map((execution) => execution.id));

    await tx.carrierExecution.updateMany({
      where: {
        quoteRequestId: id,
        status: {
          in: ["PENDING", "QUEUED", "STARTING", "AUTHENTICATING", "FILLING_FORM", "SUBMITTING", "READING_RESULTS"]
        }
      },
      data: {
        status: "CANCELLED",
        finishedAt: new Date(),
        currentStep: "cancelled_by_operator"
      }
    });

    const updatedQuoteRequest = await tx.quoteRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: quoteInclude
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        quoteRequestId: id,
        action: "QUOTE_REQUEST_CANCELLED",
        entityType: "QuoteRequest",
        entityId: id,
        metadataJson: {}
      }
    });

    return updatedQuoteRequest;
  });

  if (publisher.cancelCarrierExecution) {
    const cancelCarrierExecution = (executionId: string) =>
      publisher.cancelCarrierExecution?.(executionId) ?? Promise.resolve();
    await Promise.all(cancellableExecutionIds.map((executionId) => cancelCarrierExecution(executionId)));
  }

  return serializeQuoteRequest(quoteRequest);
};

export const retryCarrierExecution = async (
  prisma: AppPrismaClient,
  publisher: QuoteJobPublisher,
  user: AuthUser,
  quoteRequestId: string,
  carrierSlug: string
): Promise<SerializedQuoteRequest> => {
  const quoteRequest = await prisma.$transaction(async (tx) => {
    const previousExecution = await tx.carrierExecution.findFirst({
      where: {
        quoteRequestId,
        carrier: {
          slug: carrierSlug
        },
        status: {
          in: ["FAILED_RETRYABLE", "FAILED_FINAL", "CANCELLED"]
        }
      },
      include: {
        carrier: true
      },
      orderBy: {
        attempt: "desc"
      }
    });

    if (!previousExecution) {
      throw new ApiError(409, "Carrier execution is not retryable", "EXECUTION_NOT_RETRYABLE");
    }

    await tx.carrierExecution.create({
      data: {
        quoteRequestId,
        carrierId: previousExecution.carrierId,
        status: "QUEUED",
        attempt: previousExecution.attempt + 1,
        adapterVersion: previousExecution.adapterVersion
      }
    });

    const updatedQuoteRequest = await tx.quoteRequest.update({
      where: { id: quoteRequestId },
      data: { status: "QUEUED" },
      include: quoteInclude
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        quoteRequestId,
        action: "CARRIER_EXECUTION_RETRIED",
        entityType: "CarrierExecution",
        entityId: previousExecution.id,
        metadataJson: {
          carrierSlug,
          previousAttempt: previousExecution.attempt
        }
      }
    });

    return updatedQuoteRequest;
  });

  const newestExecution = quoteRequest.executions.at(-1);

  if (newestExecution) {
    await publisher.publishCarrierExecution({
      quoteRequestId,
      carrierExecutionId: newestExecution.id,
      carrierSlug
    });
  }

  return serializeQuoteRequest(quoteRequest);
};

const csvEscape = (value: string | number | null | undefined): string => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

export const exportQuoteRequest = async (
  prisma: AppPrismaClient,
  id: string,
  format: "json" | "csv"
): Promise<{ contentType: string; body: string }> => {
  const quoteRequest = await getQuoteRequest(prisma, id);

  if (format === "json") {
    return {
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify(quoteRequest, null, 2)
    };
  }

  const rows = [
    [
      "carrier",
      "plan",
      "currency",
      "totalPrice",
      "pricePerTraveler",
      "medicalCoverage",
      "baggageCoverage",
      "status"
    ],
    ...quoteRequest.executions.flatMap((execution) =>
      execution.plans.map((plan) => {
        const medical = plan.coverages.find((coverage) => coverage.code === "MEDICAL_HOSPITAL");
        const baggage = plan.coverages.find((coverage) => coverage.code === "BAGGAGE_LOSS");

        return [
          execution.carrierName,
          plan.planName,
          plan.currency,
          plan.totalPrice,
          plan.pricePerTraveler ?? "",
          medical?.amount ?? "",
          baggage?.amount ?? "",
          execution.status
        ];
      })
    )
  ];

  return {
    contentType: "text/csv; charset=utf-8",
    body: rows.map((row) => row.map(csvEscape).join(",")).join("\n")
  };
};
