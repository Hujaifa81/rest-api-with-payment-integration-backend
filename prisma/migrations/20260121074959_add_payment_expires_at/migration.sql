/*
  Warnings:

  - You are about to drop the column `isVerified` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `outbox_events` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" DROP COLUMN "isVerified";

-- DropTable
DROP TABLE "outbox_events";
