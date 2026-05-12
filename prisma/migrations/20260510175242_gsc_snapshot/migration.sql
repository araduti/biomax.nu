-- CreateTable
CREATE TABLE "GscSnapshot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GscSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GscSnapshot_page_query_date_idx" ON "GscSnapshot"("page", "query", "date");

-- CreateIndex
CREATE INDEX "GscSnapshot_date_idx" ON "GscSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "GscSnapshot_date_page_query_key" ON "GscSnapshot"("date", "page", "query");
