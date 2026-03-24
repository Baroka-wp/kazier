-- CreateTable
CREATE TABLE "evaluations" (
    "id" SERIAL NOT NULL,
    "evaluator_id" INTEGER NOT NULL,
    "evaluated_id" INTEGER NOT NULL,
    "report_date" DATE NOT NULL DEFAULT CURRENT_DATE,
    "communication" INTEGER NOT NULL,
    "collaboration" INTEGER NOT NULL,
    "punctuality" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "evaluations_evaluator_id_evaluated_id_report_date_key" ON "evaluations"("evaluator_id", "evaluated_id", "report_date");

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_evaluated_id_fkey" FOREIGN KEY ("evaluated_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
