-- CreateTable
CREATE TABLE `deferred_session` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(200) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `deferred_session_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deferred_session_day` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `session_id` INTEGER NOT NULL,
    `date` DATE NOT NULL,

    UNIQUE INDEX `deferred_session_day_session_id_date_key`(`session_id`, `date`),
    UNIQUE INDEX `deferred_session_day_id_session_id_key`(`id`, `session_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deferred_session_exam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `day_id` INTEGER NOT NULL,
    `session_id` INTEGER NOT NULL,
    `exam_code` VARCHAR(30) NOT NULL,
    `exam_name` VARCHAR(256) NOT NULL,
    `teachers` JSON NOT NULL,
    `slot` ENUM('morning', 'afternoon') NOT NULL,

    UNIQUE INDEX `deferred_session_exam_session_id_exam_code_key`(`session_id`, `exam_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `deferred_session_day` ADD CONSTRAINT `deferred_session_day_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `deferred_session`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deferred_session_exam` ADD CONSTRAINT `deferred_session_exam_day_id_session_id_fkey` FOREIGN KEY (`day_id`, `session_id`) REFERENCES `deferred_session_day`(`id`, `session_id`) ON DELETE CASCADE ON UPDATE CASCADE;
