-- AlterTable
ALTER TABLE "project" ADD COLUMN     "team_manager_id" INTEGER;

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_team_manager_id_fkey" FOREIGN KEY ("team_manager_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
