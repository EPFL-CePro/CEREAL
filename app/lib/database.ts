'use server';
import mysql from 'mysql2';
import type { ResultSetHeader } from 'mysql2';
import { examBlockingPrintStatus, examNotAdminStatus } from './examStatus';
import { Service } from '@/types/service';
import { ExamType } from '@/types/examType';
import { AcademicYear, FormattedAcademicYear } from '@/types/academicYear';
import { FormattedSection, Section } from '@/types/section';
import { CrepExam } from '@/types/crepExam';
import { Exam, NewExam } from '@/types/exam';
import { ServiceLevel } from '@/types/serviceLevel';
import { ExamStatus } from '@/types/examStatus';
import { formatDateTimeForDatabase } from './dateTime';

export async function getAllCrepExams() {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('SELECT * from crep;', (err, rows) => {
            if (err) throw err
            resolve(rows);
        })
        connection.end()
    })
}

export async function getAllNonAdminExams() {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query(`SELECT * from crep WHERE status IN (${examNotAdminStatus.map(obj => `"${obj.value}"`).join(", ")});`, (err, rows) => {
            if (err) throw err
            resolve(rows);
        })
        connection.end()
    })
}

export async function updateExamDateById(id: string, startDate: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE crep SET print_date = ? WHERE id = ?;', [startDate, id], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamStatusById(id: string, status: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE crep SET status = ? WHERE id = ?;', [status, id], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamRemarkById(id: string, remark: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE crep SET remark = ? WHERE id = ?;', [remark, id], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamReproRemarkById(id: string, reproRemark: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE crep SET repro_remark = ? WHERE id = ?;', [reproRemark, id], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function getAllExamsByStatus(status: Array<string>): Promise<CrepExam[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query(`SELECT * from crep WHERE status IN (${status.map(obj => `"${obj}"`).join(", ")});`, (err:mysql.QueryError, rows:CrepExam[]) => {
            if (err) throw err
            resolve(rows);
        })
        connection.end()
    })
}

export async function getAllExamsBetweenDates(beginDate: Date, endDate: Date): Promise<CrepExam[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query(`SELECT * from crep WHERE print_date between '${formatDateTimeForDatabase(beginDate)}' and '${formatDateTimeForDatabase(endDate)}'`, (err:mysql.QueryError, rows:CrepExam[]) => {
            if (err) throw err
            resolve(rows);
        })
        connection.end()
    })
}

export async function insertExamForPrint(exam: {
    exam_code: string;
    exam_date: string | Date;
    exam_name: string;
    exam_pages: number;
    exam_students: number;
    print_date?: string | Date;
    paper_format?: string;
    paper_color?: string;
    contact?: string;
    authorized_persons?: string;
    remark?: string | null;
    repro_remark?: string | null;
    status?: string;
    registered_by: string;
    need_scan: boolean;
    financial_center: string;
    files: string;
    desired_date: string | Date;
    print: string;
}): Promise<number> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    connection.connect();

    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO crep (exam_code, exam_date, exam_name, exam_pages, exam_students, print_date, paper_format, paper_color, contact, authorized_persons, remark, repro_remark, status, registered_by, need_scan, financial_center, files, desired_date, print) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

        const params = [
            exam.exam_code,
            exam.exam_date,
            exam.exam_name,
            exam.exam_pages,
            exam.exam_students,
            exam.print_date,
            exam.paper_format,
            exam.paper_color,
            exam.contact,
            exam.authorized_persons,
            exam.remark || null,
            exam.repro_remark || null,
            exam.status || 'registered',
            exam.registered_by,
            exam.need_scan,
            exam.financial_center,
            exam.files,
            exam.desired_date,
            exam.print
        ];

        connection.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve((result as ResultSetHeader).insertId as number);
        });
        connection.end();
    });
}

export async function getAllExamsForDate(date:string): Promise <CrepExam[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * FROM crep WHERE DATE(print_date) = DATE(?);', [date], (err, rows) => {
            if (err) throw err
            resolve(rows as CrepExam[]);
        })
        connection.end()
    })
}

export async function getBlockingExamsForDate(date:string): Promise <CrepExam[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query(
            'SELECT * FROM crep WHERE DATE(print_date) = DATE(?) AND status IN (?);',
            [date, examBlockingPrintStatus],
            (err, rows) => {
                if (err) throw err
                resolve(rows as CrepExam[]);
            }
        )
        connection.end()
    })
}

export async function getLogs(sciper: string) {
  const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  connection.connect();
  
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT l.*, un.read_at, (un.read_at IS NOT NULL) AS is_read FROM crep_log l LEFT JOIN user_notification un ON un.log_id = l.id AND un.sciper = ? ORDER BY l.date_time DESC, l.id DESC;',
      [sciper],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
    connection.end();
  });
}

export async function markAsRead(sciper: string) {
  const connection = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  });

  connection.connect();
  
  return new Promise((resolve, reject) => {
    connection.query(
      'INSERT INTO user_notification (log_id, sciper, read_at) SELECT l.id, ?, CURRENT_TIMESTAMP(6) FROM crep_log l ON DUPLICATE KEY UPDATE read_at = IF(user_notification.read_at IS NULL, CURRENT_TIMESTAMP(6), user_notification.read_at);',
      [sciper],
      (err) => {
        if (err) return reject(err);
        resolve({ ok: true });
      }
    );
    connection.end();
  });
}

export async function getAllServices(): Promise <Service[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * FROM service;', (err, rows) => {
            if (err) throw err
            resolve(rows as Service[]);
        })
        connection.end()
    })
}

export async function getAllExamTypes(): Promise <ExamType[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * FROM exam_type;', (err, rows) => {
            if (err) throw err
            resolve(rows as ExamType[]);
        })
        connection.end()
    })
}

export async function insertExam(exam: NewExam): Promise<number> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    });

    connection.connect();

    return new Promise((resolve, reject) => {
        const sql = `INSERT INTO exam (code, name, service_level_id, service_id, exam_type_id, exam_status_id, exam_date, academic_year_id, exam_semester, nb_students, nb_pages, total_pages, remark, section_id, responsible_id, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

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
            exam.section_id,
            exam.responsible_id,
            exam.contact,
        ];

        connection.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve((result as ResultSetHeader).insertId as number);
        });
        connection.end();
    });
}

export async function getAllAcademicYears():Promise <FormattedAcademicYear[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * FROM academic_year;', (err:mysql.QueryError | null, rows:AcademicYear[]) => {
            if (err) throw err
            const formattedResult = rows.map(academicYear => ({
                value: academicYear.id,
                label: academicYear.code,
                academicYear: {
                    id: academicYear.id,
                    code: academicYear.code,
                    name: academicYear.name,
                }
            }))
            resolve(formattedResult as FormattedAcademicYear[]);
        })
        connection.end()
    })
}

export async function getAllSections():Promise <FormattedSection[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * FROM section;', (err:mysql.QueryError | null, rows:Section[]) => {
            if (err) throw err
            const formattedResult = rows.map(section => ({
                value: section.id,
                label: section.code,
                section: {
                    id: section.id,
                    code: section.code,
                    name: section.name,
                }
            }))
            resolve(formattedResult as FormattedSection[]);
        })
        connection.end()
    })
}

export async function getServiceById(serviceId:string): Promise<Service[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * FROM service WHERE id = ?;', [serviceId], (err, rows) => {
            if (err) throw err
            resolve(rows as Service[]);
        })
        connection.end()
    })
}

export async function getAllExams(): Promise <Exam[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * FROM exam;', (err, rows) => {
            if (err) throw err
            resolve(rows as Exam[]);
        })
        connection.end()
    })
}

export async function getExamsByAcademicYear(academicYear: string): Promise <Exam[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT exam.* FROM exam LEFT JOIN academic_year ON exam.academic_year_id = academic_year.id WHERE academic_year.code = ?;', [academicYear], (err, rows) => {
            if (err) throw err
            resolve(rows as Exam[]);
        })
        connection.end()
    })
}

export async function getAllServiceLevels(): Promise <ServiceLevel[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * from service_level;', (err, rows) => {
            if (err) throw err
            resolve(rows as ServiceLevel[]);
        })
        connection.end()
    })
}

export async function getAllExamStatus(): Promise <ExamStatus[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()
    
    return new Promise(function(resolve) {
        connection.query('SELECT * from exam_status;', (err, rows) => {
            if (err) throw err
            resolve(rows as ExamStatus[]);
        })
        connection.end()
    })
}

/* ----- UPDATES DB FROM EXAM TABLE ----- */
export async function updateExamServiceLevel(examId: string, serviceLevelId: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET service_level_id = ? WHERE id = ?;', [serviceLevelId, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamService(examId: string, serviceId: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET service_id = ? WHERE id = ?;', [serviceId, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamType(examId: string, examTypeId: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET exam_type_id = ? WHERE id = ?;', [examTypeId, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamStatus(examId: string, examStatusId: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET exam_status_id = ? WHERE id = ?;', [examStatusId, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamDate(examId: string, examDate: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET exam_date = ? WHERE id = ?;', [examDate, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamStudentsNumber(examId: string, nbStudents: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET nb_students = ? WHERE id = ?;', [nbStudents, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamPagesNumber(examId: string, nbPages: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET nb_pages = ? WHERE id = ?;', [nbPages, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamRemark(examId: string, remark: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET remark = ? WHERE id = ?;', [remark, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateExamResponsible(examId: string, responsibleId: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE exam SET responsible_id = ? WHERE id = ?;', [responsibleId, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function deleteExam(examId: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('DELETE FROM exam WHERE id = ?;', [examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function deleteCrepExam(examId: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('DELETE FROM crep WHERE id = ?;', [examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateCrepBoxes(examId: string, boxes: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE crep SET boxes = ? WHERE id = ?;', [boxes, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateCrepPriceUnit(examId: string, priceUnit: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE crep SET price_unit = ? WHERE id = ?;', [priceUnit, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function updateCrepPriceTotal(examId: string, priceTotal: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('UPDATE crep SET price_total = ? WHERE id = ?;', [priceTotal, examId], (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}
