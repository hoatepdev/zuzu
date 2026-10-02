-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyTransaction_orderId_key" ON "LoyaltyTransaction"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

