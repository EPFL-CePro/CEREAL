-- The absence remark is replaced by the `on_hold` SAC status (existing remarks are dropped on purpose).
-- The remark on each deferred exam registration is kept.

-- AlterTable
ALTER TABLE `exam_student_absence` DROP COLUMN `sac_remark`;
