-- New SAC status `on_hold`: the SAC waits for more information before treating the absence.
-- Only used on absences, but the enum is shared with the deferred exam registrations.

-- AlterTable
ALTER TABLE `deferred_exam_registration` MODIFY `sac_status` ENUM('not_treated', 'accepted', 'not_accepted', 'on_hold') NOT NULL DEFAULT 'not_treated';

-- AlterTable
ALTER TABLE `exam_student_absence` MODIFY `sac_status` ENUM('not_treated', 'accepted', 'not_accepted', 'on_hold') NOT NULL DEFAULT 'not_treated';
