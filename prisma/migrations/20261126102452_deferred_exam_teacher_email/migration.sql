-- CreateTable
CREATE TABLE `deferred_exam_teacher_email` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `deferred_session_exam_id` INTEGER NULL,
    `sent_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `sent_by` INTEGER NOT NULL,
    `recipients_to` JSON NOT NULL,
    `recipients_cc` JSON NOT NULL,
    `subject` VARCHAR(256) NOT NULL,
    `body` MEDIUMTEXT NOT NULL,
    `exam_code` VARCHAR(30) NOT NULL,
    `exam_name` VARCHAR(256) NOT NULL,

    UNIQUE INDEX `deferred_exam_teacher_email_deferred_session_exam_id_key`(`deferred_session_exam_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `deferred_exam_teacher_email` ADD CONSTRAINT `deferred_exam_teacher_email_deferred_session_exam_id_fkey` FOREIGN KEY (`deferred_session_exam_id`) REFERENCES `deferred_session_exam`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
