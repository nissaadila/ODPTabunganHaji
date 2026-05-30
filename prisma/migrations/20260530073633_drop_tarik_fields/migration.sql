/*
  Warnings:

  - You are about to drop the column `alasan` on the `transaksi` table. All the data in the column will be lost.
  - You are about to drop the column `bukti_url` on the `transaksi` table. All the data in the column will be lost.
  - You are about to drop the column `catatan` on the `transaksi` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "transaksi" DROP COLUMN "alasan",
DROP COLUMN "bukti_url",
DROP COLUMN "catatan";
