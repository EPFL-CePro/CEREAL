-- Replace the boolean `sac_has_accepted` with a 3-state `sac_status`, keeping the data:
-- true -> 'accepted', false / NULL -> 'not_treated' (false was the default value at insertion)

-- AlterTable
ALTER TABLE `deferred_exam_registration` ADD COLUMN `sac_status` ENUM('not_treated', 'accepted', 'not_accepted') NOT NULL DEFAULT 'not_treated';
UPDATE `deferred_exam_registration` SET `sac_status` = 'accepted' WHERE `sac_has_accepted` = 1;
ALTER TABLE `deferred_exam_registration` DROP COLUMN `sac_has_accepted`;

-- AlterTable
ALTER TABLE `exam_student_absence` ADD COLUMN `sac_status` ENUM('not_treated', 'accepted', 'not_accepted') NOT NULL DEFAULT 'not_treated';
UPDATE `exam_student_absence` SET `sac_status` = 'accepted' WHERE `sac_has_accepted` = 1;
ALTER TABLE `exam_student_absence` DROP COLUMN `sac_has_accepted`;
