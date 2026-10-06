-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'ORDER_READY';

-- CreateTable
CREATE TABLE "IntegrationCredential" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IntegrationCredential_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationCredential_provider_key" ON "IntegrationCredential"("provider");
CREATE INDEX "Notification_orderId_channel_type_status_idx" ON "Notification"("orderId", "channel", "type", "status");
