import type {
  AdapterInputValidationResult,
  CarrierRunContext,
  CarrierRunResult,
  TravelInsuranceCarrierAdapter
} from "@travel-quote/carrier-sdk";
import type { TravelQuoteRequest } from "@travel-quote/domain";

export const carrierAMetadata = {
  id: "carrier-a",
  name: "Carrier A",
  version: "0.1.0-mock",
  supportedDestinations: ["COUNTRY", "REGION", "WORLDWIDE"],
  maxTravelers: 10,
  supportsMultiCountry: true,
  requiresAuthentication: false
};

export const carrierAAdapter: TravelInsuranceCarrierAdapter = {
  metadata: carrierAMetadata,
  validateInput(input: TravelQuoteRequest): Promise<AdapterInputValidationResult> {
    if (input.travelers.length > carrierAMetadata.maxTravelers) {
      return Promise.resolve({
        valid: false,
        errors: [
          {
            code: "INVALID_INPUT",
            message: "Traveler count exceeds carrier mock limit",
            retryable: false
          }
        ]
      });
    }

    return Promise.resolve({ valid: true });
  },
  run(context: CarrierRunContext, input: TravelQuoteRequest): Promise<CarrierRunResult> {
    if (process.env.CARRIER_A_MOCK_RESULT === "fail") {
      throw new Error("Carrier A mock failure");
    }

    const travelerCount = input.travelers.length;
    const totalPrice = 129.9 * travelerCount;

    return Promise.resolve({
      externalQuoteReference: `mock-a-${context.executionId}`,
      warnings: [],
      plans: [
        {
          id: `mock-plan-a-${context.executionId}`,
          carrierId: carrierAMetadata.id,
          carrierName: carrierAMetadata.name,
          externalPlanId: "mock-a-basic",
          planName: "Mock A Essencial",
          currency: "BRL",
          totalPrice,
          pricePerTraveler: totalPrice / travelerCount,
          coverages: [
            {
              code: "MEDICAL_HOSPITAL",
              displayName: "Assistencia medica hospitalar",
              amount: 30000,
              currency: "USD",
              included: true
            },
            {
              code: "BAGGAGE_LOSS",
              displayName: "Extravio de bagagem",
              amount: 1200,
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
