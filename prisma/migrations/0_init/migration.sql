-- CreateTable
CREATE TABLE `comments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_id` INTEGER NOT NULL,
    `content` MEDIUMTEXT NULL,
    `registered_by` JSON NOT NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_exam_idx`(`exam_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crep` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_name` VARCHAR(256) NOT NULL,
    `exam_code` VARCHAR(24) NOT NULL,
    `status` VARCHAR(32) NOT NULL DEFAULT 'registered',
    `print_date` DATETIME(0) NOT NULL,
    `print_duration` INTEGER NOT NULL DEFAULT 0,
    `remark` MEDIUMTEXT NULL,
    `repro_remark` MEDIUMTEXT NULL,
    `exam_date` DATE NOT NULL,
    `contact` MEDIUMTEXT NOT NULL,
    `authorized_persons` MEDIUMTEXT NOT NULL,
    `registered_by` VARCHAR(256) NOT NULL,
    `financial_center` VARCHAR(10) NOT NULL,
    `desired_date` DATE NOT NULL,
    `boxes` INTEGER NOT NULL DEFAULT 0,
    `price_unit` FLOAT NOT NULL DEFAULT 0,
    `price_total` FLOAT NOT NULL DEFAULT 0,
    `created_on` DATE NOT NULL DEFAULT (curdate()),
    `order_number` VARCHAR(32) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crep_file` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `crep_id` INTEGER NOT NULL,
    `file_name` VARCHAR(255) NULL,
    `exam_pages` INTEGER NOT NULL,
    `exam_students` INTEGER NOT NULL,
    `paper_format` VARCHAR(2) NOT NULL,
    `paper_color` VARCHAR(10) NOT NULL,
    `print` VARCHAR(16) NOT NULL DEFAULT 'recto-verso',
    `need_scan` BOOLEAN NOT NULL,

    UNIQUE INDEX `uq_crep_file_name`(`crep_id`, `file_name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `crep_log` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `action` VARCHAR(8) NOT NULL,
    `date_time` DATETIME(0) NOT NULL,
    `crep_id` INTEGER NOT NULL,
    `exam_name` VARCHAR(256) NOT NULL,
    `delivery_date` DATETIME(0) NOT NULL,
    `exam_date` DATETIME(0) NOT NULL,
    `contact` VARCHAR(256) NOT NULL,
    `exam_code` VARCHAR(24) NOT NULL,
    `changes` JSON NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deferred_exam_registration` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `exam_student_absence_id` INTEGER NOT NULL,
    `exam_code` VARCHAR(25) NOT NULL,
    `exam_name` VARCHAR(256) NOT NULL,
    `exam_date` DATE NOT NULL,
    `sac_has_accepted` BOOLEAN NULL,
    `sac_remark` VARCHAR(500) NULL,
    `isa_has_grade` BOOLEAN NULL,

    INDEX `fk_exam_student_absence_idx`(`exam_student_absence_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `email_template` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `template_key` VARCHAR(64) NOT NULL,
    `section` VARCHAR(45) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `subject` TEXT NULL,
    `body` TEXT NULL,
    `recipients_to` TEXT NULL,
    `recipients_cc` TEXT NULL,
    `reply_to` TEXT NULL,

    UNIQUE INDEX `template_key_UNIQUE`(`template_key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NULL,
    `name` VARCHAR(150) NULL,
    `service_level_id` INTEGER NULL,
    `service_id` INTEGER NULL,
    `exam_type_id` INTEGER NULL,
    `exam_status_id` INTEGER NULL,
    `exam_date` DATE NULL,
    `academic_year_id` VARCHAR(20) NULL,
    `exam_semester` VARCHAR(10) NULL,
    `nb_students` INTEGER NULL,
    `nb_pages` INTEGER NULL,
    `total_pages` INTEGER NULL,
    `deadline_prep` DATE NULL,
    `deadline_repro` DATE NULL,
    `remark` TEXT NULL,
    `responsible_id` INTEGER NULL,
    `contact` JSON NULL,

    INDEX `fk_exam_academic_year_idx`(`academic_year_id`),
    INDEX `fk_exam_status_idx`(`exam_status_id`),
    INDEX `fk_exam_type_idx`(`exam_type_id`),
    INDEX `fk_responsible_idx`(`responsible_id`),
    INDEX `fk_service_level_idx`(`service_level_id`),
    INDEX `fk_services_idx`(`service_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_status` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(45) NULL,
    `name` VARCHAR(100) NULL,
    `color` VARCHAR(45) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_student_absence` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sciper` INTEGER NOT NULL,
    `last_name` VARCHAR(100) NOT NULL,
    `first_name` VARCHAR(100) NOT NULL,
    `certificate_date_from` DATE NOT NULL,
    `certificate_date_to` DATE NOT NULL,
    `certificate_file_name` VARCHAR(255) NULL,
    `created_at` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `comment` VARCHAR(500) NULL,
    `sac_has_accepted` BOOLEAN NULL,
    `sac_remark` VARCHAR(500) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `exam_type` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NULL,
    `name` VARCHAR(50) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scans` (
    `scans` JSON NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(45) NULL,
    `description` VARCHAR(100) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_level` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(20) NULL,
    `name` VARCHAR(50) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_notification` (
    `log_id` INTEGER NOT NULL,
    `sciper` VARCHAR(6) NOT NULL,
    `read_at` DATETIME(6) NULL,

    INDEX `idx_user_unread`(`sciper`, `read_at`, `log_id`),
    PRIMARY KEY (`log_id`, `sciper`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `exam`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `crep_file` ADD CONSTRAINT `fk_crep_file_crep` FOREIGN KEY (`crep_id`) REFERENCES `crep`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `deferred_exam_registration` ADD CONSTRAINT `deferred_exam_registration_ibfk_1` FOREIGN KEY (`exam_student_absence_id`) REFERENCES `exam_student_absence`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `fk_exam_exam_status` FOREIGN KEY (`exam_status_id`) REFERENCES `exam_status`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `fk_exam_exam_type` FOREIGN KEY (`exam_type_id`) REFERENCES `exam_type`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `fk_exam_service` FOREIGN KEY (`service_id`) REFERENCES `service`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `exam` ADD CONSTRAINT `fk_exam_service_level` FOREIGN KEY (`service_level_id`) REFERENCES `service_level`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_notification` ADD CONSTRAINT `fk_un_log` FOREIGN KEY (`log_id`) REFERENCES `crep_log`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION;


-- Triggers
CREATE TRIGGER crep_after_insert AFTER INSERT ON crep FOR EACH ROW INSERT INTO crep_log (action, date_time, crep_id, exam_name, delivery_date, exam_date, contact, exam_code) VALUES ('insert', NOW(), NEW.id, NEW.exam_name, NEW.print_date, NEW.exam_date, NEW.contact, NEW.exam_code);

CREATE TRIGGER crep_after_update AFTER UPDATE ON crep FOR EACH ROW BEGIN
DECLARE c JSON DEFAULT JSON_OBJECT();

IF NOT (OLD.exam_name <=> NEW.exam_name) THEN
    SET c = JSON_SET(c, '$.exam_name', JSON_OBJECT('old', OLD.exam_name, 'new', NEW.exam_name));
END IF;
IF NOT (OLD.exam_code <=> NEW.exam_code) THEN
    SET c = JSON_SET(c, '$.exam_code', JSON_OBJECT('old', OLD.exam_code, 'new', NEW.exam_code));
END IF;
IF NOT (OLD.status <=> NEW.status) THEN
    SET c = JSON_SET(c, '$.status', JSON_OBJECT('old', OLD.status, 'new', NEW.status));
END IF;
IF NOT (OLD.print_date <=> NEW.print_date) THEN
    SET c = JSON_SET(c, '$.print_date', JSON_OBJECT('old', OLD.print_date, 'new', NEW.print_date));
END IF;
IF NOT (OLD.print_duration <=> NEW.print_duration) THEN
    SET c = JSON_SET(c, '$.print_duration', JSON_OBJECT('old', OLD.print_duration, 'new', NEW.print_duration));
END IF;
IF NOT (OLD.exam_date <=> NEW.exam_date) THEN
    SET c = JSON_SET(c, '$.exam_date', JSON_OBJECT('old', OLD.exam_date, 'new', NEW.exam_date));
END IF;
IF NOT (OLD.desired_date <=> NEW.desired_date) THEN
    SET c = JSON_SET(c, '$.desired_date', JSON_OBJECT('old', OLD.desired_date, 'new', NEW.desired_date));
END IF;
IF NOT (OLD.financial_center <=> NEW.financial_center) THEN
    SET c = JSON_SET(c, '$.financial_center', JSON_OBJECT('old', OLD.financial_center, 'new', NEW.financial_center));
END IF;
IF NOT (OLD.registered_by <=> NEW.registered_by) THEN
    SET c = JSON_SET(c, '$.registered_by', JSON_OBJECT('old', OLD.registered_by, 'new', NEW.registered_by));
END IF;
IF NOT (OLD.boxes <=> NEW.boxes) THEN
    SET c = JSON_SET(c, '$.boxes', JSON_OBJECT('old', OLD.boxes, 'new', NEW.boxes));
END IF;
IF NOT (OLD.price_unit <=> NEW.price_unit) THEN
    SET c = JSON_SET(c, '$.price_unit', JSON_OBJECT('old', OLD.price_unit, 'new', NEW.price_unit));
END IF;
IF NOT (OLD.price_total <=> NEW.price_total) THEN
    SET c = JSON_SET(c, '$.price_total', JSON_OBJECT('old', OLD.price_total, 'new', NEW.price_total));
END IF;
IF NOT (OLD.order_number <=> NEW.order_number) THEN
    SET c = JSON_SET(c, '$.order_number', JSON_OBJECT('old', OLD.order_number, 'new', NEW.order_number));
END IF;
IF NOT (OLD.created_on <=> NEW.created_on) THEN
    SET c = JSON_SET(c, '$.created_on', JSON_OBJECT('old', OLD.created_on, 'new', NEW.created_on));
END IF;

-- Champs volumineux : on note seulement qu'ils ont chang�
IF NOT (OLD.remark <=> NEW.remark) THEN
    SET c = JSON_SET(c, '$.remark', TRUE);
END IF;
IF NOT (OLD.repro_remark <=> NEW.repro_remark) THEN
    SET c = JSON_SET(c, '$.repro_remark', TRUE);
END IF;
IF NOT (OLD.contact <=> NEW.contact) THEN
    SET c = JSON_SET(c, '$.contact', TRUE);
END IF;
IF NOT (OLD.authorized_persons <=> NEW.authorized_persons) THEN
    SET c = JSON_SET(c, '$.authorized_persons', TRUE);
END IF;

IF JSON_LENGTH(c) > 0 THEN
    INSERT INTO crep_log (action, date_time, crep_id, exam_name, delivery_date, exam_date, contact, exam_code, changes)
    VALUES ('update', NOW(), NEW.id, NEW.exam_name, NEW.print_date, NEW.exam_date, NEW.contact, NEW.exam_code, c);
END IF;
END;

CREATE TRIGGER crep_after_delete AFTER DELETE ON crep FOR EACH ROW INSERT INTO crep_log (action, date_time, crep_id, exam_name, delivery_date, exam_date, contact, exam_code) VALUES ('delete', NOW(), OLD.id, OLD.exam_name, OLD.print_date, OLD.exam_date, OLD.contact, OLD.exam_code);

CREATE TRIGGER crep_file_after_insert AFTER INSERT ON crep_file FOR EACH ROW BEGIN
-- Files inserted while registering a request are not logged one by one :
-- the `insert` log of the request is enough. See `insertExamForPrint()`.
IF COALESCE(@crep_registering, 0) = 0 THEN
    INSERT INTO crep_log (action, date_time, crep_id, exam_name, delivery_date, exam_date, contact, exam_code, changes)
    SELECT 'update', NOW(), c.id, c.exam_name, c.print_date, c.exam_date, c.contact, c.exam_code,
           JSON_OBJECT('file', JSON_OBJECT('old', NULL, 'new', COALESCE(NEW.file_name, '(no file)')))
    FROM crep c WHERE c.id = NEW.crep_id;
END IF;
END;

CREATE TRIGGER crep_file_after_update AFTER UPDATE ON crep_file FOR EACH ROW BEGIN
DECLARE c JSON DEFAULT JSON_OBJECT();
DECLARE prefix VARCHAR(270) DEFAULT CONCAT(COALESCE(NEW.file_name, '(no file)'), ' � ');

IF NOT (OLD.file_name <=> NEW.file_name) THEN
    SET c = JSON_MERGE_PATCH(c, JSON_OBJECT('file', JSON_OBJECT('old', OLD.file_name, 'new', NEW.file_name)));
END IF;
IF NOT (OLD.exam_students <=> NEW.exam_students) THEN
    SET c = JSON_MERGE_PATCH(c, JSON_OBJECT(CONCAT(prefix, 'exam_students'), JSON_OBJECT('old', OLD.exam_students, 'new', NEW.exam_students)));
END IF;
IF NOT (OLD.exam_pages <=> NEW.exam_pages) THEN
    SET c = JSON_MERGE_PATCH(c, JSON_OBJECT(CONCAT(prefix, 'exam_pages'), JSON_OBJECT('old', OLD.exam_pages, 'new', NEW.exam_pages)));
END IF;
IF NOT (OLD.paper_format <=> NEW.paper_format) THEN
    SET c = JSON_MERGE_PATCH(c, JSON_OBJECT(CONCAT(prefix, 'paper_format'), JSON_OBJECT('old', OLD.paper_format, 'new', NEW.paper_format)));
END IF;
IF NOT (OLD.paper_color <=> NEW.paper_color) THEN
    SET c = JSON_MERGE_PATCH(c, JSON_OBJECT(CONCAT(prefix, 'paper_color'), JSON_OBJECT('old', OLD.paper_color, 'new', NEW.paper_color)));
END IF;
IF NOT (OLD.print <=> NEW.print) THEN
    SET c = JSON_MERGE_PATCH(c, JSON_OBJECT(CONCAT(prefix, 'print'), JSON_OBJECT('old', OLD.print, 'new', NEW.print)));
END IF;
IF NOT (OLD.need_scan <=> NEW.need_scan) THEN
    SET c = JSON_MERGE_PATCH(c, JSON_OBJECT(CONCAT(prefix, 'need_scan'), JSON_OBJECT('old', OLD.need_scan, 'new', NEW.need_scan)));
END IF;

IF JSON_LENGTH(c) > 0 THEN
    INSERT INTO crep_log (action, date_time, crep_id, exam_name, delivery_date, exam_date, contact, exam_code, changes)
    SELECT 'update', NOW(), cr.id, cr.exam_name, cr.print_date, cr.exam_date, cr.contact, cr.exam_code, c
    FROM crep cr WHERE cr.id = NEW.crep_id;
END IF;
END;

CREATE TRIGGER crep_file_after_delete AFTER DELETE ON crep_file FOR EACH ROW BEGIN
INSERT INTO crep_log (action, date_time, crep_id, exam_name, delivery_date, exam_date, contact, exam_code, changes)
SELECT 'update', NOW(), c.id, c.exam_name, c.print_date, c.exam_date, c.contact, c.exam_code,
       JSON_OBJECT('file', JSON_OBJECT('old', COALESCE(OLD.file_name, '(no file)'), 'new', NULL))
FROM crep c WHERE c.id = OLD.crep_id;
END;

