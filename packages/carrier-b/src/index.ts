import type {
  AdapterInputValidationResult,
  CarrierRunContext,
  CarrierRunResult,
  TravelInsuranceCarrierAdapter
} from "@travel-quote/carrier-sdk";
import type { TravelQuoteRequest } from "@travel-quote/domain";

export const carrierBMetadata = {
  id: "carrier-b",
  name: "Carrier B",
  version: "0.1.0-mock",
  supportedDestinations: ["COUNTRY", "REGION"],
  maxTravelers: 10,
  supportsMultiCountry: true,
  requiresAuthentication: false
};

export const carrierBAdapter: TravelInsuranceCarrierAdapter = {
  metadata: carrierBMetadata,
  validateInput(): Promise<AdapterInputValidationResult> {
    return Promise.resolve({ valid: true });
  },
  run(context: CarrierRunContext, input: TravelQuoteRequest): Promise<CarrierRunResult> {
    if (process.env.CARRIER_B_MOCK_RESULT === "fail") {
      throw new Error("Carrier B mock failure");
    }

    const travelerCount = input.travelers.length;
    const totalPrice = 149.5 * travelerCount;

    return Promise.resolve({
      externalQuoteReference: `mock-b-${context.executionId}`,
      warnings: [],
      plans: [
        {
          id: `mock-plan-b-${context.executionId}`,
          carrierId: carrierBMetadata.id,
          carrierName: carrierBMetadata.name,
          externalPlanId: "mock-b-standard",
          planName: "Mock B Standard",
          currency: "BRL",
          totalPrice,
          pricePerTraveler: totalPrice / travelerCount,
          coverages: [
            {
              code: "MEDICAL_HOSPITAL",
              displayName: "Assistencia medica hospitalar",
              amount: 50000,
              currency: "USD",
              included: true
            },
            {
              code: "FLIGHT_DELAY",
              displayName: "Atraso de voo",
              amount: 500,
              currency: "BRL",
              included: true
            }
          ],
          collectedAt: new Date().toISOString()
        }
      ]
    });
  }
};
