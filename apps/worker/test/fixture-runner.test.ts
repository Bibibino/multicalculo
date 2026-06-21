import { beforeAll, describe, expect, it } from "vitest";
import { createBrowserSession, HumanInterventionRequiredError } from "@travel-quote/browser-core";
import type { TravelQuoteRequest } from "@travel-quote/domain";
import { carrierAFixtures } from "@travel-quote/test-fixtures";
import {
  fillCarrierAQuoteFixture,
  FormChangedError,
  readCarrierAResultFixture
} from "../src/fixture-runner.js";

let browserAvailable = false;

const quoteInput: TravelQuoteRequest = {
  id: "quote-fixture",
  userId: "user-fixture",
  originCountry: "BR",
  destination: { type: "COUNTRY", countryCodes: ["PT"] },
  departureDate: "2026-09-10",
  returnDate: "2026-09-25",
  travelers: [{ id: "traveler-fixture", birthDate: "1995-05-17" }],
  tripPurpose: "LEISURE",
  selectedCarrierIds: ["carrier-a"],
  createdAt: "2026-06-21T00:00:00.000Z"
};

beforeAll(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/tmp/ms-playwright";

  try {
    const session = await createBrowserSession({ executionId: "fixture-availability-test" });
    await session.close();
    browserAvailable = true;
  } catch {
    browserAvailable = false;
  }
});

describe("fixture runner", () => {
  it("fills the expected quote form fixture", async () => {
    if (!browserAvailable) {
      return;
    }

      const session = await createBrowserSession({ executionId: "fixture-fill-test" });
    try {
      await fillCarrierAQuoteFixture(session, quoteInput);
      await expect(session.page.getByLabel("Origem").inputValue()).resolves.toBe("BR");
      await expect(session.page.getByLabel("Passageiros").inputValue()).resolves.toBe("1");
    } finally {
      await session.close();
    }
  });

  it("detects changed form fixtures", async () => {
    if (!browserAvailable) {
      return;
    }

    const session = await createBrowserSession({ executionId: "fixture-change-test" });
    try {
      await expect(
        fillCarrierAQuoteFixture(session, quoteInput, carrierAFixtures.quoteFormChanged)
      ).rejects.toBeInstanceOf(FormChangedError);
    } finally {
      await session.close();
    }
  });

  it("detects CAPTCHA as human intervention", async () => {
    if (!browserAvailable) {
      return;
    }

    const session = await createBrowserSession({ executionId: "fixture-captcha-test" });
    try {
      await expect(
        readCarrierAResultFixture(session, "execution-captcha", carrierAFixtures.captcha)
      ).rejects.toBeInstanceOf(HumanInterventionRequiredError);
    } finally {
      await session.close();
    }
  });

  it("extracts normalized plans from result fixtures", async () => {
    if (!browserAvailable) {
      return;
    }

    const session = await createBrowserSession({ executionId: "fixture-result-test" });
    try {
      const result = await readCarrierAResultFixture(session, "execution-result");

      expect(result).toMatchObject({
        type: "SUCCESS",
        plans: [
          {
            carrierId: "carrier-a",
            planName: "Fixture A Essencial"
          }
        ]
      });
    } finally {
      await session.close();
    }
  });
});
