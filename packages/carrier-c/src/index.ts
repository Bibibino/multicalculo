import type {
  AdapterInputValidationResult,
  CarrierRunContext,
  CarrierRunResult,
  TravelInsuranceCarrierAdapter
} from "@travel-quote/carrier-sdk";
import type { TravelQuoteRequest } from "@travel-quote/domain";

export const carrierCMetadata = {
  id: "carrier-c",
  name: "Carrier C",
  version: "0.1.0-mock",
  supportedDestinations: ["COUNTRY", "WORLDWIDE"],
  maxTravelers: 10,
  supportsMultiCountry: true,
  requiresAuthentication: false
};

export const carrierCAdapter: TravelInsuranceCarrierAdapter = {
  metadata: carrierCMetadata,
  validateInput(): Promise<AdapterInputValidationResult> {
    return Promise.resolve({ valid: true });
  },
  run(context: CarrierRunContext, input: TravelQuoteRequest): Promise<CarrierRunResult> {
    if (process.env.CARRIER_C_MOCK_RESULT === "fail") {
      throw new Error("Carrier C mock failure");
    }

    const travelerCount = input.travelers.length;
    const totalPrice = 99.75 * travelerCount;

    return Promise.resolve({
      externalQuoteReference: `mock-c-${context.executionId}`,
      warnings: [],
      plans: [
        {
          id: `mock-plan-c-${context.executionId}`,
          carrierId: carrierCMetadata.id,
          carrierName: carrierCMetadata.name,
          externalPlanId: "mock-c-economy",
          planName: "Mock C Economico",
          currency: "BRL",
          totalPrice,
          pricePerTraveler: totalPrice / travelerCount,
          coverages: [
            {
              code: "MEDICAL_HOSPITAL",
              displayName: "Assistencia medica hospitalar",
              amount: 20000,
              currency: "USD",
              included: true
            },
            {
              code: "DENTAL",
              displayName: "Assistencia odontologica",
              amount: 300,
              currency: "USD",
              included: true
            }
          ],
          collectedAt: new Date().toISOString()
        }
      ]
    });
  }
};
