'use server';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Service } from '@/types/service';
import { ExamType } from '@/types/examType';
import { Exam, NewExam } from '@/types/exam';
import { ServiceLevel } from '@/types/serviceLevel';
import { ExamStatus } from '@/types/examStatus';
import { EmailTemplate } from '@/types/emailTemplate';
import { EMAIL_TEMPLATES } from '@/app/lib/emailTemplates';
import type { Absence, NewAbsence } from '@/types/absence';
import type { DiffExam, NewDiffExam } from '@/types/diffExam';
import {db} from "@/app/lib/db";
import { requirePermission } from "@/app/lib/requirePermission";
import { Permission } from "@/app/lib/routeAccess";

// No permission check on purpose: reference data used by the teachers form too (every logged-in user).
export async function getAllServices(): Promise <Service[]> {
    const [rows] = await db.query('SELECT * FROM service');
    return rows as Service[];
}

export async function insertService(service: Omit<Service, 'id'>): Promise<number> {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO service (code, description) VALUES (?, ?)',
        [service.code, service.description]
    );
    return result.insertId;
}

export async function deleteService(service: Service) : Promise<ResultSetHeader>  {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.execute<ResultSetHeader>(
        'DELETE FROM service WHERE id = ?',
        [service.id]
    );
    return result;
}

export async function insertServiceLevel(serviceLevel: Omit<ServiceLevel, 'id'>): Promise<number> {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO service_level (code, name) VALUES (?, ?)',
        [serviceLevel.code, serviceLevel.name]
    );
    return result.insertId;
}

export async function deleteServiceLevel(serviceLevel: ServiceLevel) : Promise<ResultSetHeader> {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.execute<ResultSetHeader>(
        'DELETE FROM service_level WHERE id = ?',
        [serviceLevel.id]
    );
    return result;
}

export async function insertExamStatus(examStatus: Omit<ExamStatus, 'id'>): Promise<number> {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO exam_status (code, name, color) VALUES (?, ?, ?)',
        [examStatus.code, examStatus.name, examStatus.color]
    );
    return result.insertId;
}

export async function deleteExamStatus(examStatus: ExamStatus) : Promise<ResultSetHeader> {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.execute<ResultSetHeader>(
        'DELETE FROM exam_status WHERE id = ?',
        [examStatus.id]
    );
    return result;
}

// No permission check on purpose: reference data used by the teachers form too (every logged-in user).
export async function getAllExamTypes(): Promise <ExamType[]> {
    const [rows] = await db.query('SELECT * FROM exam_type');
    return rows as ExamType[];
}

// No permission check on purpose: used by the teachers form (every logged-in user).
export async function insertExam(exam: NewExam): Promise<number> {
    const params = [
        exam.code,
        exam.name,
        exam.service_level_id,
        exam.service_id,
        exam.exam_type_id,
        exam.exam_status_id,
        exam.exam_date || null,
        exam.academic_year_id,
        exam.exam_semester,
        exam.nb_students || null,
        exam.nb_pages || null,
        exam.total_pages || null,
        // exam.deadline_prep,
        // exam.deadline_repro,
        exam.remark || null,
        exam.responsible_id,
        exam.contact,
    ];

    const [result] = await db.execute<ResultSetHeader>(
        'INSERT INTO exam (code, name, service_level_id, service_id, exam_type_id, exam_status_id, exam_date, academic_year_id, exam_semester, nb_students, nb_pages, total_pages, remark, responsible_id, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        params
    );

    return result.insertId;
}

export async function getAcademicYearsFromExams(): Promise<string[]> {
    await requirePermission(Permission.ADMIN);
    const [rows] = await db.query<(RowDataPacket & { academic_year_id: string })[]>(
        'SELECT DISTINCT academic_year_id FROM exam WHERE academic_year_id IS NOT NULL AND academic_year_id <> "" ORDER BY academic_year_id ASC;'
    );
    return rows.map((row) => row.academic_year_id);
}

export async function getExamCountsByAcademicYearAndService(): Promise<{ academic_year_id: string; service_id: number; count: number }[]> {
    await requirePermission(Permission.ADMIN);
    const [rows] = await db.query<(RowDataPacket & { academic_year_id: string; service_id: number; count: number })[]>(
        'SELECT academic_year_id, service_id, COUNT(*) AS count FROM exam WHERE academic_year_id IS NOT NULL AND academic_year_id <> "" AND service_id IS NOT NULL GROUP BY academic_year_id, service_id ORDER BY academic_year_id ASC;'
    );
    return rows.map((row) => ({ ...row, count: Number(row.count) }));
}

export async function getCopyAndPageCountsByAcademicYear(): Promise<{ academic_year_id: string; copies: number; pages: number }[]> {
    await requirePermission(Permission.ADMIN);
    const [rows] = await db.query<(RowDataPacket & { academic_year_id: string; copies: number; pages: number })[]>(
        'SELECT academic_year_id, COALESCE(SUM(nb_students), 0) AS copies, COALESCE(SUM(nb_students * nb_pages), 0) AS pages FROM exam WHERE academic_year_id IS NOT NULL AND academic_year_id <> "" GROUP BY academic_year_id ORDER BY academic_year_id ASC;'
    );
    return rows.map((row) => ({ ...row, copies: Number(row.copies), pages: Number(row.pages) }));
}

// No permission check on purpose: reference data used by the teachers form (every logged-in user).
export async function getServiceById(serviceId:string): Promise<Service[]> {
    const [rows] = await db.query('SELECT * FROM service WHERE id = ?;', [serviceId]);
    return rows as Service[];
}

export async function getAllExams(): Promise <Exam[]> {
    await requirePermission(Permission.ADMIN);
    const [rows] = await db.query('SELECT * FROM exam;');
    return rows as Exam[];
}

export async function getExamsByAcademicYear(academicYear: string): Promise <Exam[]> {
    await requirePermission(Permission.ADMIN);
    const [rows] = await db.query('SELECT exam.* FROM exam WHERE exam.academic_year_id = ?;', [academicYear]);
    return rows as Exam[];
}

export async function getAllServiceLevels(): Promise <ServiceLevel[]> {
    await requirePermission(Permission.ADMIN);
    const [rows] = await db.query('SELECT * from service_level;');
    return rows as ServiceLevel[];
}

export async function getAllExamStatus(): Promise <ExamStatus[]> {
    await requirePermission(Permission.ADMIN);
    const [rows] = await db.query('SELECT * from exam_status;');
    return rows as ExamStatus[];
}

/* ----- UPDATES DB FROM EXAM TABLE ----- */
export async function updateExamServiceLevel(examId: string, serviceLevelId: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET service_level_id = ? WHERE id = ?;', [serviceLevelId, examId]);
    return JSON.stringify(result);
}

export async function updateExamService(examId: string, serviceId: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET service_id = ? WHERE id = ?;', [serviceId, examId]);
    return JSON.stringify(result);
}

export async function updateExamType(examId: string, examTypeId: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET exam_type_id = ? WHERE id = ?;', [examTypeId, examId]);
    return JSON.stringify(result);
}

export async function updateExamStatus(examId: string, examStatusId: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET exam_status_id = ? WHERE id = ?;', [examStatusId, examId]);
    return JSON.stringify(result);
}

export async function updateExamDate(examId: string, examDate: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET exam_date = ? WHERE id = ?;', [examDate, examId]);
    return JSON.stringify(result);
}

export async function updateExamStudentsNumber(examId: string, nbStudents: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET nb_students = ? WHERE id = ?;', [nbStudents, examId]);
    return JSON.stringify(result);
}

export async function updateExamPagesNumber(examId: string, nbPages: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET nb_pages = ? WHERE id = ?;', [nbPages, examId]);
    return JSON.stringify(result);
}

export async function updateExamRemark(examId: string, remark: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET remark = ? WHERE id = ?;', [remark, examId]);
    return JSON.stringify(result);
}

export async function updateExamResponsible(examId: string, responsibleId: number | null) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('UPDATE exam SET responsible_id = ? WHERE id = ?;', [responsibleId, examId]);
    return JSON.stringify(result);
}

export async function deleteExam(examId: string) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query('DELETE FROM exam WHERE id = ?;', [examId]);
    return JSON.stringify(result);
}

// Reconcile the email_template table with the EMAIL_TEMPLATES registry, which is
// the source of truth:
//  - INSERT the templates that are actually missing (existing rows, including
//    admin customizations, are left untouched);
//  - DELETE the rows whose template_key is no longer in the registry (an email
//    removed from the code disappears from the DB and the admin UI).
// Adding/removing an email therefore only requires a registry change + call site,
// with no manual SQL in production. We insert only the missing rows (rather than
// INSERT IGNORE everything) so the common case writes nothing and does not burn
// AUTO_INCREMENT ids on every page load.
export async function syncEmailTemplates() {
    await requirePermission(Permission.ADMIN);
    const keys = Object.keys(EMAIL_TEMPLATES)

    const [rows] = await db.query<(RowDataPacket & { template_key: string })[]>('SELECT template_key FROM email_template;')

    const existing = new Set(rows.map((row) => row.template_key))
    const toInsert = Object.entries(EMAIL_TEMPLATES)
        .filter(([key]) => !existing.has(key))
        .map(([key, def]) => [
            key,
            def.section,
            def.name,
            def.defaults.subject,
            def.defaults.body,
            def.defaults.to,
            def.defaults.cc,
            def.defaults.replyTo,
        ])

    if (toInsert.length > 0) {
        await db.query(
            'INSERT INTO email_template (template_key, section, name, subject, body, recipients_to, recipients_cc, reply_to) VALUES ?;',
            [toInsert]
        )
    }

    await db.query('DELETE FROM email_template WHERE template_key NOT IN (?);', [keys])
}

export async function getAllEmailTemplates(): Promise<EmailTemplate[]> {
    await requirePermission(Permission.ADMIN);
    const [rows] = await db.query('SELECT * FROM email_template ORDER BY id;');
    return rows as EmailTemplate[];
}

// No permission check on purpose: used to send the emails of the actions of any logged-in user.
export async function getEmailTemplate(templateKey: string): Promise<EmailTemplate | null> {
    const [rows] = await db.query('SELECT * FROM email_template WHERE template_key = ?;', [templateKey]);
    const templates = rows as EmailTemplate[]
    return templates.length > 0 ? templates[0] : null;
}

export async function updateEmailTemplate(template: EmailTemplate) {
    await requirePermission(Permission.ADMIN);
    const [result] = await db.query(
        'UPDATE email_template SET name = ?, subject = ?, body = ?, recipients_to = ?, recipients_cc = ?, reply_to = ? WHERE template_key = ?;',
        [template.name, template.subject, template.body, template.recipients_to, template.recipients_cc, template.reply_to, template.template_key]
    );
    return JSON.stringify(result);
}

// No permission check on purpose: used by the deferred exams form (every logged-in user).
export async function insertAbsence(absence: NewAbsence): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO exam_student_absence (sciper, first_name, last_name, certificate_date_from, certificate_date_to, certificate_file_name, comment, sac_has_accepted, sac_remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
            absence.sciper,
            absence.first_name,
            absence.last_name,
            absence.certificate_date_from,
            absence.certificate_date_to,
            absence.certificate_file_name,
            absence.comment,
            absence.sac_has_accepted,
            absence.sac_remark
        ]
    );
    return result.insertId;
}

// No permission check on purpose: used by the deferred exams form (every logged-in user).
export async function insertDiffExamSubscription(diffExam: NewDiffExam): Promise<number> {
    const [result] = await db.query<ResultSetHeader>(
        `INSERT INTO deferred_exam_registration (exam_student_absence_id, exam_code, exam_name, exam_date, isa_has_grade) VALUES (?, ?, ?, ?, ?);`,
        [
            diffExam.exam_student_absence_id,
            diffExam.exam_code,
            diffExam.exam_name,
            diffExam.exam_date,
            diffExam.isa_has_grade,
        ]
    );
    return result.insertId;
}

export async function getAllAbsences(): Promise <Absence[]> {
    await requirePermission(Permission.SAC);
    type AbsenceWithDiffExamRow = RowDataPacket & Omit<Absence, 'deferred_exam_registrations'> & {
        diff_exam_id: string | null;
        diff_exam_absence_id: number | null;
        exam_code: string | null;
        exam_name: string | null;
        exam_date: Date | null;
        isa_has_grade: boolean | null;
        diff_exam_sac_has_accepted: boolean | null;
        diff_exam_sac_remark: string | null;
    };

    const sql = `
        SELECT
            exam_student_absence.id,
            exam_student_absence.sciper,
            exam_student_absence.first_name,
            exam_student_absence.last_name,
            exam_student_absence.certificate_date_from,
            exam_student_absence.certificate_date_to,
            exam_student_absence.certificate_file_name,
            exam_student_absence.comment,
            exam_student_absence.sac_has_accepted,
            exam_student_absence.sac_remark,
            exam_student_absence.created_at,
            deferred_exam_registration.id AS diff_exam_id,
            deferred_exam_registration.exam_student_absence_id AS diff_exam_absence_id,
            deferred_exam_registration.exam_code,
            deferred_exam_registration.exam_name,
            deferred_exam_registration.exam_date,
            deferred_exam_registration.isa_has_grade,
            deferred_exam_registration.sac_has_accepted AS diff_exam_sac_has_accepted,
            deferred_exam_registration.sac_remark AS diff_exam_sac_remark
        FROM exam_student_absence
        LEFT JOIN deferred_exam_registration
            ON deferred_exam_registration.exam_student_absence_id = exam_student_absence.id;
    `;

    const [rows] = await db.query<AbsenceWithDiffExamRow[]>(sql);

    const absences = new Map<string, Absence>();

    for (const row of rows) {
        let absence = absences.get(row.id);

        if (!absence) {
            absence = {
                id: row.id,
                sciper: row.sciper,
                first_name: row.first_name,
                last_name: row.last_name,
                certificate_date_from: row.certificate_date_from,
                certificate_date_to: row.certificate_date_to,
                certificate_file_name: row.certificate_file_name,
                comment: row.comment,
                sac_has_accepted: row.sac_has_accepted,
                sac_remark: row.sac_remark,
                created_at: row.created_at,
                deferred_exam_registrations: [],
            };
            absences.set(row.id, absence);
        }

        if (row.diff_exam_id !== null) {
            absence.deferred_exam_registrations.push({
                id: row.diff_exam_id,
                exam_student_absence_id: row.diff_exam_absence_id as number,
                exam_code: row.exam_code as string,
                exam_name: row.exam_name as string,
                exam_date: row.exam_date as Date,
                isa_has_grade: row.isa_has_grade as boolean,
                sac_has_accepted: row.diff_exam_sac_has_accepted as boolean,
                sac_remark: row.diff_exam_sac_remark as string,
            } satisfies DiffExam);
        }
    }

    return Array.from(absences.values());
}

export async function getAbsenceCertificateFileNameById(id: string): Promise<string | null> {
    await requirePermission(Permission.SAC);
    const [rows] = await db.query<RowDataPacket[]>(
        "SELECT certificate_file_name FROM exam_student_absence WHERE id = ? LIMIT 1;",
        [id]
    );
    return rows[0]?.certificate_file_name ?? null;
}

// TODO - WARNING: Exposed via 'use server'. Dynamically interpolating table and column names leads to SQL Injection vulnerabilities.
export async function updateSACById(tableName: string, columnName: string, id: string, value: boolean | string) {
    await requirePermission(Permission.SAC);
    const [result] = await db.query(
        `UPDATE ${tableName} SET ${columnName} = ? WHERE id = ?`,
        [value, id]
    );
    return JSON.stringify(result);
}
