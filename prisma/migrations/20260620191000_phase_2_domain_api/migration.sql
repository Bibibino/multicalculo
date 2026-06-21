CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');
CREATE TYPE "QuoteRequestStatus" AS ENUM ('DRAFT', 'QUEUED', 'RUNNING', 'PARTIALLY_COMPLETED', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "CarrierExecutionStatus" AS ENUM ('PENDING', 'QUEUED', 'STARTING', 'AUTHENTICATING', 'FILLING_FORM', 'SUBMITTING', 'READING_RESULTS', 'WAITING_HUMAN', 'SUCCEEDED', 'FAILED_RETRYABLE', 'FAILED_FINAL', 'CANCELLED');
CREATE TYPE "CarrierCredentialStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ROTATED');
CREATE TYPE "ExecutionArtifactType" AS ENUM ('SCREENSHOT', 'TRACE', 'HTML_SNAPSHOT', 'DOM_SUMMARY', 'RAW_RESPONSE', 'LOG_EXCERPT');
CREATE TYPE "CoverageCode" AS ENUM ('MEDICAL_HOSPITAL', 'COVID_MEDICAL', 'DENTAL', 'PHARMACEUTICAL', 'BAGGAGE_LOSS', 'BAGGAGE_DELAY', 'FLIGHT_DELAY', 'TRIP_CANCELLATION', 'TRIP_INTERRUPTION', 'MEDICAL_TRANSFER', 'BODY_TRANSFER', 'LEGAL_ASSISTANCE', 'ACCIDENTAL_DEATH', 'PERMANENT_DISABILITY', 'OTHER');
CREATE TYPE "HumanInterventionType" AS ENUM ('CAPTCHA', 'MFA', 'SESSION_EXPIRED', 'TERMS_CHANGED', 'UNKNOWN_PAGE', 'MANUAL_REVIEW');
CREATE TYPE "HumanInterventionStatus" AS ENUM ('PENDING', 'RESOLVED', 'EXPIRED', 'CANCELLED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "providerId" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "QuoteRequest" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "originCountry" TEXT NOT NULL,
  "destinationJson" JSONB NOT NULL,
  "departureDate" DATE NOT NULL,
  "returnDate" DATE NOT NULL,
  "tripPurpose" TEXT NOT NULL,
  "status" "QuoteRequestStatus" NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QuoteRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Traveler" (
  "id" TEXT NOT NULL,
  "quoteRequestId" TEXT NOT NULL,
  "birthDate" DATE NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Traveler_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Carrier" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "adapterVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Carrier_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarrierCredential" (
  "id" TEXT NOT NULL,
  "carrierId" TEXT NOT NULL,
  "organizationId" TEXT,
  "encryptedPayload" TEXT NOT NULL,
  "keyVersion" TEXT NOT NULL,
  "status" "CarrierCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarrierCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CarrierExecution" (
  "id" TEXT NOT NULL,
  "quoteRequestId" TEXT NOT NULL,
  "carrierId" TEXT NOT NULL,
  "status" "CarrierExecutionStatus" NOT NULL DEFAULT 'QUEUED',
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "errorCode" TEXT,
  "errorMessageSanitized" TEXT,
  "currentStep" TEXT,
  "externalQuoteReference" TEXT,
  "adapterVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CarrierExecution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TravelPlan" (
  "id" TEXT NOT NULL,
  "carrierExecutionId" TEXT NOT NULL,
  "carrierId" TEXT NOT NULL,
  "externalPlanId" TEXT,
  "planName" TEXT NOT NULL,
  "currency" TEXT NOT NULL,
  "totalPrice" DECIMAL(12,2) NOT NULL,
  "pricePerTraveler" DECIMAL(12,2),
  "validUntil" TIMESTAMP(3),
  "purchaseUrl" TEXT,
  "rawResultJsonEncrypted" TEXT,
  "rawResultReference" TEXT,
  "collectedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TravelPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Coverage" (
  "id" TEXT NOT NULL,
  "travelPlanId" TEXT NOT NULL,
  "code" "CoverageCode" NOT NULL,
  "displayName" TEXT NOT NULL,
  "amount" DECIMAL(12,2),
  "currency" TEXT,
  "included" BOOLEAN NOT NULL,
  "details" TEXT,
  CONSTRAINT "Coverage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExecutionArtifact" (
  "id" TEXT NOT NULL,
  "carrierExecutionId" TEXT NOT NULL,
  "type" "ExecutionArtifactType" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sanitized" BOOLEAN NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ExecutionArtifact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "quoteRequestId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "metadataJson" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HumanIntervention" (
  "id" TEXT NOT NULL,
  "carrierExecutionId" TEXT NOT NULL,
  "type" "HumanInterventionType" NOT NULL,
  "status" "HumanInterventionStatus" NOT NULL DEFAULT 'PENDING',
  "instructions" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "resolvedByUserId" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HumanIntervention_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Carrier_slug_key" ON "Carrier"("slug");
CREATE INDEX "QuoteRequest_status_idx" ON "QuoteRequest"("status");
CREATE INDEX "QuoteRequest_createdAt_idx" ON "QuoteRequest"("createdAt");
CREATE INDEX "QuoteRequest_userId_idx" ON "QuoteRequest"("userId");
CREATE INDEX "Traveler_quoteRequestId_idx" ON "Traveler"("quoteRequestId");
CREATE INDEX "CarrierCredential_carrierId_idx" ON "CarrierCredential"("carrierId");
CREATE INDEX "CarrierExecution_quoteRequestId_idx" ON "CarrierExecution"("quoteRequestId");
CREATE INDEX "CarrierExecution_carrierId_idx" ON "CarrierExecution"("carrierId");
CREATE INDEX "CarrierExecution_status_idx" ON "CarrierExecution"("status");
CREATE INDEX "TravelPlan_carrierExecutionId_idx" ON "TravelPlan"("carrierExecutionId");
CREATE INDEX "TravelPlan_carrierId_idx" ON "TravelPlan"("carrierId");
CREATE INDEX "Coverage_travelPlanId_idx" ON "Coverage"("travelPlanId");
CREATE INDEX "ExecutionArtifact_carrierExecutionId_idx" ON "ExecutionArtifact"("carrierExecutionId");
CREATE INDEX "ExecutionArtifact_expiresAt_idx" ON "ExecutionArtifact"("expiresAt");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_quoteRequestId_idx" ON "AuditLog"("quoteRequestId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "HumanIntervention_carrierExecutionId_idx" ON "HumanIntervention"("carrierExecutionId");
CREATE INDEX "HumanIntervention_status_idx" ON "HumanIntervention"("status");
CREATE INDEX "HumanIntervention_expiresAt_idx" ON "HumanIntervention"("expiresAt");

ALTER TABLE "QuoteRequest" ADD CONSTRAINT "QuoteRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Traveler" ADD CONSTRAINT "Traveler_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarrierCredential" ADD CONSTRAINT "CarrierCredential_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CarrierExecution" ADD CONSTRAINT "CarrierExecution_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CarrierExecution" ADD CONSTRAINT "CarrierExecution_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TravelPlan" ADD CONSTRAINT "TravelPlan_carrierExecutionId_fkey" FOREIGN KEY ("carrierExecutionId") REFERENCES "CarrierExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TravelPlan" ADD CONSTRAINT "TravelPlan_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Carrier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Coverage" ADD CONSTRAINT "Coverage_travelPlanId_fkey" FOREIGN KEY ("travelPlanId") REFERENCES "TravelPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExecutionArtifact" ADD CONSTRAINT "ExecutionArtifact_carrierExecutionId_fkey" FOREIGN KEY ("carrierExecutionId") REFERENCES "CarrierExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_quoteRequestId_fkey" FOREIGN KEY ("quoteRequestId") REFERENCES "QuoteRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "HumanIntervention" ADD CONSTRAINT "HumanIntervention_carrierExecutionId_fkey" FOREIGN KEY ("carrierExecutionId") REFERENCES "CarrierExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HumanIntervention" ADD CONSTRAINT "HumanIntervention_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
