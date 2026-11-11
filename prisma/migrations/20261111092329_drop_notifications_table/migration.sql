/*
  Warnings:

  - You are about to drop the `user_notification` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `user_notification` DROP FOREIGN KEY `fk_un_log`;

-- DropTable
DROP TABLE `user_notification`;
