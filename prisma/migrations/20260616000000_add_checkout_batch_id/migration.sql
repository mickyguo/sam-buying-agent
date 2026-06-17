-- AlterTable
ALTER TABLE "Order" ADD COLUMN "checkoutBatchId" TEXT;

-- CreateIndex
CREATE INDEX "Order_checkoutBatchId_idx" ON "Order"("checkoutBatchId");
