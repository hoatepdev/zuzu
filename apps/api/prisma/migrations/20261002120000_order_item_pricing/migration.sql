-- Preserve the historical applied price for existing items.
ALTER TABLE "OrderItem" ADD COLUMN "baseUnitPrice" DECIMAL(14,0);
UPDATE "OrderItem" SET "baseUnitPrice" = "unitPrice";
ALTER TABLE "OrderItem" ALTER COLUMN "baseUnitPrice" SET NOT NULL;

ALTER TABLE "OrderItem" ADD COLUMN "priceAdjustmentReason" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
