/*
  Warnings:

  - The primary key for the `report` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `report` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(191) NOT NULL,
    ALTER COLUMN `status` DROP DEFAULT,
    ADD PRIMARY KEY (`id`);
