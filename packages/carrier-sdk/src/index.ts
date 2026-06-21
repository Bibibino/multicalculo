import type { BrowserSession } from "@travel-quote/browser-core";
import type {
  AdapterErrorCode,
  NormalizedTravelPlan,
  TravelQuoteRequest
} from "@travel-quote/domain";
import type { StructuredLogger } from "@travel-quote/observability";

export type CarrierMetadata = {
  id: string;
  name: string;
  version: string;
  supportedDestinations: string[];
  maxTravelers: number;
  supportsMultiCountry: boolean;
  requiresAuthentication: boolean;
};

export type AdapterWarning = {
  code: string;
  message: string;
};

export type AdapterError = {
  code: AdapterErrorCode;
  message: string;
  retryable: boolean;
};

export type AdapterInputValidationResult =
  | { valid: true }
  | { valid: false; errors: AdapterError[] };

export type ArtifactCollector = {
  collect(input: { type: string; path: string; sanitized: boolean }): Promise<string>;
};

export type HumanInterventionGateway = {
  request(input: { type: string; instructions: string; expiresAt: string }): Promise<string>;
};

export type CarrierRunContext = {
  executionId: string;
  logger: StructuredLogger;
  browser: BrowserSession;
  artifacts: ArtifactCollector;
  cancellationSignal: AbortSignal;
  intervention: HumanInterventionGateway;
};

export type CarrierRunResult = {
  plans: NormalizedTravelPlan[];
  externalQuoteReference?: string;
  warnings: AdapterWarning[];
};

export interface TravelInsuranceCarrierAdapter {
  readonly metadata: CarrierMetadata;
  validateInput(input: TravelQuoteRequest): Promise<AdapterInputValidationResult>;
  run(context: CarrierRunContext, input: TravelQuoteRequest): Promise<CarrierRunResult>;
}

export interface AdapterStep<TContext> {
  readonly id: string;
  execute(context: TContext): Promise<StepResult>;
}

export type StepResult =
  | { type: "SUCCESS" }
  | { type: "RETRY"; reason: string }
  | { type: "WAITING_HUMAN"; interventionId: string }
  | { type: "FAILURE"; error: AdapterError };
