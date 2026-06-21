import type { CarrierExecution, PrismaClient } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { updateQuoteRequestAggregateStatus } from "../src/processor.js";

const makeExecution = (status: CarrierExecution["status"]): CarrierExecution =>
  ({
    id: crypto.randomUUID(),
    quoteRequestId: "quote-1",
    carrierId: "carrier-1",
    status,
    attempt: 1,
    startedAt: null,
    finishedAt: null,
    errorCode: null,
    errorMessageSanitized: null,
    currentStep: null,
    externalQuoteReference: null,
    adapterVersion: "0.1.0-mock",
    createdAt: new Date(),
    updatedAt: new Date()
  }) satisfies CarrierExecution;

describe("updateQuoteRequestAggregateStatus", () => {
  it("marks partial completion when at least one carrier succeeds and one fails", async () => {
    const updates: unknown[] = [];
    const prisma = {
      carrierExecution: {
        findMany: () =>
          Promise.resolve([
            makeExecution("SUCCEEDED"),
            makeExecution("FAILED_RETRYABLE"),
            makeExecution("SUCCEEDED")
          ])
      },
      quoteRequest: {
        update: (args: unknown) => {
          updates.push(args);
          return Promise.resolve(args);
        }
      }
    } as unknown as PrismaClient;

    await updateQuoteRequestAggregateStatus(prisma, "quote-1");

    expect(updates).toEqual([
      {
        where: { id: "quote-1" },
        data: { status: "PARTIALLY_COMPLETED" }
      }
    ]);
  });
});
