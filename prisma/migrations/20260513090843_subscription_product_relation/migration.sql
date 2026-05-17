-- CreateIndex
CREATE INDEX "SubscriptionLine_productId_idx" ON "SubscriptionLine"("productId");

-- AddForeignKey
ALTER TABLE "SubscriptionLine" ADD CONSTRAINT "SubscriptionLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
