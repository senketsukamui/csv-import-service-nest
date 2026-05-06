/*
  Warnings:

  - Added the required column `data` to the `ImportedRow` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ImportedRow" ADD COLUMN     "data" JSONB NOT NULL;
