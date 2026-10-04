ALTER TABLE "Customer" ADD COLUMN "address" TEXT;

ALTER TABLE "Order"
  ADD COLUMN "dueDate" TIMESTAMP(3),
  ADD COLUMN "deliveryAddress" TEXT,
  ADD COLUMN "receivedServices" JSONB NOT NULL DEFAULT '[]';
