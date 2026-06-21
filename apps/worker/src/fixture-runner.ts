import { HumanInterventionRequiredError, fixtureFileUrl, type BrowserSession } from "@travel-quote/browser-core";
import type { NormalizedTravelPlan, TravelQuoteRequest } from "@travel-quote/domain";
import { carrierAFixtures } from "@travel-quote/test-fixtures";

export class FormChangedError extends Error {
  constructor(message = "Expected quote form fields were not found") {
    super(message);
  }
}

export type FixtureRunResult =
  | { type: "SUCCESS"; plans: NormalizedTravelPlan[] }
  | { type: "NO_RESULTS" }
  | { type: "PORTAL_ERROR"; message: string };

export const fillCarrierAQuoteFixture = async (
  session: BrowserSession,
  input: TravelQuoteRequest,
  fixturePath = carrierAFixtures.quoteForm
): Promise<void> => {
  await session.page.goto(fixtureFileUrl(fixturePath));

  const origin = session.page.getByLabel("Origem");
  const destination = session.page.getByLabel("Destino");
  const departureDate = session.page.getByLabel("Ida");
  const returnDate = session.page.getByLabel("Volta");
  const travelers = session.page.getByLabel("Passageiros");

  if (
    !(await origin.count()) ||
    !(await destination.count()) ||
    !(await departureDate.count()) ||
    !(await returnDate.count()) ||
    !(await travelers.count())
  ) {
    throw new FormChangedError();
  }

  await origin.fill(input.originCountry);
  await destination.fill(
    input.destination.type === "COUNTRY" ? input.destination.countryCodes?.join(",") ?? "" : input.destination.type
  );
  await departureDate.fill(input.departureDate);
  await returnDate.fill(input.returnDate);
  await travelers.fill(String(input.travelers.length));
};

export const readCarrierAResultFixture = async (
  session: BrowserSession,
  executionId: string,
  fixturePath = carrierAFixtures.results
): Promise<FixtureRunResult> => {
  await session.page.goto(fixtureFileUrl(fixturePath));

  if (await session.page.getByTestId("captcha-required").count()) {
    throw new HumanInterventionRequiredError({
      executionId,
      type: "CAPTCHA",
      instructions: "Resolva a verificacao no portal antes de continuar.",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
    });
  }

  if (await session.page.getByTestId("portal-error").count()) {
    return {
      type: "PORTAL_ERROR",
      message: (await session.page.getByTestId("portal-error").textContent()) ?? "Portal error"
    };
  }

  if (await session.page.getByTestId("no-results").count()) {
    return { type: "NO_RESULTS" };
  }

  const planCard = session.page.getByTestId("plan-card").first();

  if (!(await planCard.count())) {
    throw new FormChangedError("Expected result plan card was not found");
  }

  const planName = (await planCard.locator("h2").textContent()) ?? "Fixture plan";
  const currency = (await planCard.getByTestId("currency").textContent()) ?? "BRL";
  const totalPrice = Number((await planCard.getByTestId("total-price").textContent()) ?? "0");
  const medicalCoverage = planCard.locator("dd").filter({ hasText: "Assistencia medica" });
  const baggageCoverage = planCard.locator("dd").filter({ hasText: "Bagagem" });

  return {
    type: "SUCCESS",
    plans: [
      {
        id: `fixture-plan-${executionId}`,
        carrierId: "carrier-a",
        carrierName: "Carrier A",
        externalPlanId: (await planCard.getAttribute("data-plan-id")) ?? "fixture-a",
        planName,
        currency,
        totalPrice,
        coverages: [
          {
            code: "MEDICAL_HOSPITAL",
            displayName: "Assistencia medica hospitalar",
            amount: Number((await medicalCoverage.getAttribute("data-coverage-amount")) ?? "0"),
            currency: (await medicalCoverage.getAttribute("data-coverage-currency")) ?? "USD",
            included: true
          },
          {
            code: "BAGGAGE_LOSS",
            displayName: "Extravio de bagagem",
            amount: Number((await baggageCoverage.getAttribute("data-coverage-amount")) ?? "0"),
            currency: (await baggageCoverage.getAttribute("data-coverage-currency")) ?? "BRL",
            included: true
          }
        ],
        collectedAt: new Date().toISOString()
      }
    ]
  };
};
