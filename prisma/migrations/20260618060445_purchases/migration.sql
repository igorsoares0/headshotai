-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "photoCount" INTEGER NOT NULL,
    "priceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paddleTxnId" TEXT,
    "orderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_paddleTxnId_key" ON "Purchase"("paddleTxnId");

-- CreateIndex
CREATE INDEX "Purchase_userId_status_idx" ON "Purchase"("userId", "status");
