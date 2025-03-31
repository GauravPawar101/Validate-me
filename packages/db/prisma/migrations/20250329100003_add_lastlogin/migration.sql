-- CreateEnum
CREATE TYPE "ValidatorStatus" AS ENUM ('online', 'offline');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed');

-- DropIndex
DROP INDEX "Validator_ip_key";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Validator" ADD COLUMN     "capabilities" TEXT[] DEFAULT ARRAY['http']::TEXT[],
ADD COLUMN     "lastPaid" TIMESTAMP(3),
ADD COLUMN     "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "ValidatorStatus" NOT NULL DEFAULT 'online',
ADD COLUMN     "totalPaid" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalValidations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" TEXT NOT NULL DEFAULT '1.0.0',
ALTER COLUMN "location" SET DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "Website" ADD COLUMN     "lastChecked" TIMESTAMP(3),
ADD COLUMN     "status" "WebsiteStatus",
ADD COLUMN     "validationInProgress" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WebsiteTick" ADD COLUMN     "details" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "validatorId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "txSignature" TEXT,
    "status" "PaymentStatus" NOT NULL,
    "notes" TEXT,
    "websiteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Payment_validatorId_createdAt_idx" ON "Payment"("validatorId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_createdAt_idx" ON "Payment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "WebsiteTick_validatorId_createdAt_idx" ON "WebsiteTick"("validatorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_validatorId_fkey" FOREIGN KEY ("validatorId") REFERENCES "Validator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
