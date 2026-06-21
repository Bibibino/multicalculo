import { describe, expect, it } from "vitest";
import { carrierAAdapter } from "../src/index.js";

describe("carrierAAdapter", () => {
  it("returns deterministic mock plans", async () => {
    const result = await carrierAAdapter.run(
      {
        executionId: "execution-a",
        logger: console,
        browser: {
          page: {},
          context: {},
          captureFailureArtifact: () => Promise.resolve(),
          close: () => Promise.resolve()
        },
        artifacts: { collect: () => Promise.resolve("artifact") },
        cancellationSignal: new AbortController().signal,
        intervention: { request: () => Promise.resolve("intervention") }
      },
      {
        id: "quote-1",
        userId: "user-1",
        originCountry: "BR",
        destination: { type: "COUNTRY", countryCodes: ["PT"] },
        departureDate: "2026-09-10",
        returnDate: "2026-09-25",
        travelers: [{ id: "traveler-1", birthDate: "1995-05-17" }],
        tripPurpose: "LEISURE",
        selectedCarrierIds: ["carrier-a"],
        createdAt: "2026-06-20T00:00:00.000Z"
      }
    );

    expect(result.plans).toHaveLength(1);
    expect(result.plans[0]).toMatchObject({
      carrierId: "carrier-a",
      planName: "Mock A Essencial",
      currency: "BRL"
    });
  });
});
