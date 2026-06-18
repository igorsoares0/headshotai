-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "styles" JSONB NOT NULL,
    "trainingId" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "trainedVersion" TEXT,
    "referenceUrls" JSONB NOT NULL,
    "photoCount" INTEGER NOT NULL,
    "trainSeconds" DOUBLE PRECISION,
    "genSeconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shots" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "Order"("userId");
