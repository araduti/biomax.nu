-- CreateTable
CREATE TABLE "LlmCitation" (
    "id" TEXT NOT NULL,
    "promptId" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "cited" BOOLEAN NOT NULL,
    "linked" BOOLEAN NOT NULL DEFAULT false,
    "responseExcerpt" TEXT NOT NULL,
    "responseFull" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmCitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LlmCitation_promptId_model_runAt_idx" ON "LlmCitation"("promptId", "model", "runAt");

-- CreateIndex
CREATE INDEX "LlmCitation_runAt_idx" ON "LlmCitation"("runAt");
