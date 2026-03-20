/*
  Warnings:

  - You are about to drop the column `team_manager_id` on the `project` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "project" DROP CONSTRAINT "project_team_manager_id_fkey";

-- AlterTable
ALTER TABLE "project" DROP COLUMN "team_manager_id";

-- AlterTable
ALTER TABLE "rapports" ADD COLUMN     "extra_message" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "reminder_sent" BOOLEAN NOT NULL DEFAULT false;
