import { z } from "zod";

export type TravelDestination = {
  type: "COUNTRY" | "REGION" | "WORLDWIDE";
  countryCodes?: string[];
  regionCode?: string;
};

export type Traveler = {
  id: string;
  birthDate: string;
};

export type TripPurpose = "LEISURE" | "BUSINESS" | "STUDY" | "SPORTS" | "OTHER";

export type TravelQuoteRequest = {
  id: string;
  userId: string;
  originCountry: string;
  destination: TravelDestination;
  departureDate: string;
  returnDate: string;
  travelers: Traveler[];
  tripPurpose: TripPurpose;
  selectedCarrierIds: string[];
  createdAt: string;
};

export type CoverageCode =
  | "MEDICAL_HOSPITAL"
  | "COVID_MEDICAL"
  | "DENTAL"
  | "PHARMACEUTICAL"
  | "BAGGAGE_LOSS"
  | "BAGGAGE_DELAY"
  | "FLIGHT_DELAY"
  | "TRIP_CANCELLATION"
  | "TRIP_INTERRUPTION"
  | "MEDICAL_TRANSFER"
  | "BODY_TRANSFER"
  | "LEGAL_ASSISTANCE"
  | "ACCIDENTAL_DEATH"
  | "PERMANENT_DISABILITY"
  | "OTHER";

export type NormalizedCoverage = {
  code: CoverageCode;
  displayName: string;
  amount?: number;
  currency?: string;
  included: boolean;
  details?: string;
};

export type InstallmentOption = {
  installments: number;
  amount: number;
  total: number;
  interestFree?: boolean;
};

export type NormalizedTravelPlan = {
  id: string;
  carrierId: string;
  carrierName: string;
  externalPlanId?: string;
  planName: string;
  currency: string;
  totalPrice: number;
  pricePerTraveler?: number;
  installmentOptions?: InstallmentOption[];
  coverages: NormalizedCoverage[];
  exclusionsSummary?: string[];
  assistanceServices?: string[];
  purchaseUrl?: string;
  externalQuoteReference?: string;
  validUntil?: string;
  collectedAt: string;
  rawResultReference?: string;
};

export type QuoteRequestStatus =
  | "DRAFT"
  | "QUEUED"
  | "RUNNING"
  | "PARTIALLY_COMPLETED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export type CarrierExecutionStatus =
  | "PENDING"
  | "QUEUED"
  | "STARTING"
  | "AUTHENTICATING"
  | "FILLING_FORM"
  | "SUBMITTING"
  | "READING_RESULTS"
  | "WAITING_HUMAN"
  | "SUCCEEDED"
  | "FAILED_RETRYABLE"
  | "FAILED_FINAL"
  | "CANCELLED";

export type AdapterErrorCode =
  | "INVALID_INPUT"
  | "UNSUPPORTED_DESTINATION"
  | "UNSUPPORTED_TRAVELER_AGE"
  | "AUTHENTICATION_FAILED"
  | "SESSION_EXPIRED"
  | "CAPTCHA_REQUIRED"
  | "MFA_REQUIRED"
  | "RATE_LIMITED"
  | "PORTAL_UNAVAILABLE"
  | "NAVIGATION_TIMEOUT"
  | "ELEMENT_NOT_FOUND"
  | "FORM_CHANGED"
  | "VALIDATION_REJECTED"
  | "NO_PLANS_AVAILABLE"
  | "RESULT_PARSE_FAILED"
  | "UNEXPECTED_REDIRECT"
  | "CANCELLED"
  | "UNKNOWN";

export type HealthStatus = "ok" | "degraded" | "down";

export type ComponentHealth = {
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
};

export type ServiceHealth = {
  service: string;
  status: HealthStatus;
  uptimeSeconds: number;
  checkedAt: string;
  checks: Record<string, ComponentHealth>;
};

export const isHealthy = (health: ServiceHealth): boolean => health.status === "ok";

export const isoCountryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/, "Use ISO 3166-1 alpha-2 country codes");

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const travelDestinationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("COUNTRY"),
    countryCodes: z.array(isoCountryCodeSchema).min(1).max(20),
    regionCode: z.never().optional()
  }).strict(),
  z.object({
    type: z.literal("REGION"),
    regionCode: z.string().min(2).max(32),
    countryCodes: z.never().optional()
  }).strict(),
  z.object({
    type: z.literal("WORLDWIDE"),
    countryCodes: z.never().optional(),
    regionCode: z.never().optional()
  }).strict()
]);

export const tripPurposeSchema = z.enum(["LEISURE", "BUSINESS", "STUDY", "SPORTS", "OTHER"]);

export const quoteRequestStatusSchema = z.enum([
  "DRAFT",
  "QUEUED",
  "RUNNING",
  "PARTIALLY_COMPLETED",
  "COMPLETED",
  "FAILED",
  "CANCELLED"
]);

export const carrierExecutionStatusSchema = z.enum([
  "PENDING",
  "QUEUED",
  "STARTING",
  "AUTHENTICATING",
  "FILLING_FORM",
  "SUBMITTING",
  "READING_RESULTS",
  "WAITING_HUMAN",
  "SUCCEEDED",
  "FAILED_RETRYABLE",
  "FAILED_FINAL",
  "CANCELLED"
]);

export const userRoleSchema = z.enum(["ADMIN", "OPERATOR", "VIEWER"]);

export const createQuoteRequestSchema = z
  .object({
    originCountry: isoCountryCodeSchema,
    destination: travelDestinationSchema,
    departureDate: isoDateSchema,
    returnDate: isoDateSchema,
    tripPurpose: tripPurposeSchema,
    travelers: z
      .array(
        z.object({
          birthDate: isoDateSchema
        }).strict()
      )
      .min(1)
      .max(10),
    selectedCarrierIds: z.array(z.string().min(1)).min(1).max(5)
  })
  .strict()
  .superRefine((input, context) => {
    const departureDate = Date.parse(`${input.departureDate}T00:00:00.000Z`);
    const returnDate = Date.parse(`${input.returnDate}T00:00:00.000Z`);
    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

    if (Number.isNaN(departureDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departureDate"],
        message: "Invalid departure date"
      });
    }

    if (Number.isNaN(returnDate)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["returnDate"],
        message: "Invalid return date"
      });
    }

    if (!Number.isNaN(departureDate) && departureDate <= todayUtc) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["departureDate"],
        message: "Departure date must be in the future"
      });
    }

    if (!Number.isNaN(departureDate) && !Number.isNaN(returnDate)) {
      if (returnDate < departureDate) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDate"],
          message: "Return date must be after or equal to departure date"
        });
      }

      const durationDays = Math.round((returnDate - departureDate) / 86_400_000) + 1;
      if (durationDays > 365) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["returnDate"],
          message: "Trip duration cannot exceed 365 days"
        });
      }
    }
  });

export type CreateQuoteRequestInput = z.infer<typeof createQuoteRequestSchema>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export type LoginInput = z.infer<typeof loginSchema>;
