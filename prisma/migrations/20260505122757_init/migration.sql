-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Import" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Import_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportError" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "errorMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedRow" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "ImportedRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Import_tenantId_idx" ON "Import"("tenantId");

-- CreateIndex
CREATE INDEX "ImportError_tenantId_idx" ON "ImportError"("tenantId");

-- CreateIndex
CREATE INDEX "ImportError_importId_idx" ON "ImportError"("importId");

-- CreateIndex
CREATE INDEX "ImportedRow_tenantId_idx" ON "ImportedRow"("tenantId");

-- CreateIndex
CREATE INDEX "ImportedRow_importId_idx" ON "ImportedRow"("importId");

-- AddForeignKey
ALTER TABLE "ImportError" ADD CONSTRAINT "ImportError_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedRow" ADD CONSTRAINT "ImportedRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "Import"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
