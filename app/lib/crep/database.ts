'use server';

import mysql, { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Connection as PromiseConnection } from 'mysql2/promise';
import { examBlockingPrintStatus, examNotAdminStatus } from '../examStatus';
import { CrepExam, CrepFile, CrepFileSpecs } from '@/types/crepExam';
import { formatDateTimeForDatabase } from '../dateTime';
import { getAcademicYearDateRange } from '@/app/lib/academicYear';
import { getPrintingDurationInMinutes } from './printingDuration';
import { getTotalCopies, pickFileSpecs, validateFilesSpecs } from './fileSpecs';

type NewCrepFile = CrepFileSpecs & { file_name: string | null };

function createPromiseConnection(): PromiseConnection {
    return mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    }).promise();
}

// Adds the files (table `crep_file`) of every exam to `exam.files`
async function attachFiles(exams: CrepExam[]): Promise<CrepExam[]> {
    if (exams.length === 0) return exams;

    const connection = createPromiseConnection();
    try {
        const [rows] = await connection.query<RowDataPacket[]>(
            'SELECT * FROM crep_file WHERE crep_id IN (?) ORDER BY id;',
            [exams.map((exam) => exam.id)]
        );
        const files = (rows as CrepFile[]).map((file) => ({ ...file, need_scan: Boolean(file.need_scan) }));

        return exams.map((exam) => ({ ...exam, files: files.filter((file) => file.crep_id === exam.id) }));
    } finally {
        await connection.end();
    }
}

async function insertFiles(connection: PromiseConnection, crepId: number, files: NewCrepFile[]) {
    await connection.query(
        'INSERT INTO crep_file (crep_id, file_name, exam_students, exam_pages, paper_format, paper_color, print, need_scan) VALUES ?;',
        [files.map((file) => {
            const specs = pickFileSpecs(file);
            return [crepId, file.file_name, specs.exam_students, specs.exam_pages, specs.paper_format, specs.paper_color, specs.print, specs.need_scan];
        })]
    );
}

// Recomputes `crep.print_duration` from the copies of all the files of the exam, returns the new duration
async function refreshPrintDuration(connection: PromiseConnection, crepId: number): Promise<number> {
    const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT COALESCE(SUM(exam_students), 0) AS copies FROM crep_file WHERE crep_id = ?;',
        [crepId]
    );
    const printDuration = getPrintingDurationInMinutes(Number(rows[0].copies));
    await connection.query('UPDATE crep SET print_duration = ? WHERE id = ?;', [printDuration, crepId]);
    return printDuration;
}

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
            resolve(attachFiles(rows as CrepExam[]));
        })
        connection.end()
    })
}

export async function getAllCrepExamsForRepro(email: string) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query(`SELECT * from crep WHERE status = 'toPrint' OR JSON_UNQUOTE(JSON_EXTRACT(contact, '$.email')) = ?;`, [email],
            (err, rows) => {
            if (err) throw err
            resolve(attachFiles(rows as CrepExam[]));
        })
        connection.end()
    })
}

export async function getCrepExamsByAcademicYear(academicYear: string): Promise<CrepExam[]> {
    const range = getAcademicYearDateRange(academicYear);
    if (!range) return [];

    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query(
            'SELECT * FROM crep WHERE exam_date >= ? AND exam_date < ?;',
            [formatDateTimeForDatabase(range.start), formatDateTimeForDatabase(range.end)],
            (err:mysql.QueryError | null, rows) => {
                if (err) throw err
                resolve(attachFiles(rows as CrepExam[]));
            }
        )
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
    const allowedStatuses = [...examNotAdminStatus.map(status => status.value), "reserved"];
    
    return new Promise(function(resolve) {
        connection.query("SELECT * from crep WHERE status IN (" + allowedStatuses.map(() => "?").join(", ") + ");", allowedStatuses, (err, rows) => {
            if (err) throw err
            resolve(attachFiles(rows as CrepExam[]));
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
            resolve(attachFiles(rows));
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
            resolve(attachFiles(rows));
        })
        connection.end()
    })
}

export async function insertExamForPrint(exam: {
    exam_code: string;
    exam_date: string | Date;
    exam_name: string;
    print_date?: string | Date;
    contact?: string;
    authorized_persons?: string;
    remark?: string | null;
    repro_remark?: string | null;
    status?: string;
    registered_by: string;
    financial_center: string;
    desired_date: string | Date;
}, files: NewCrepFile[]): Promise<number> {
    if (files.length === 0) throw new Error("An exam needs at least one file");
    const filesError = validateFilesSpecs(files);
    if (filesError) throw new Error(filesError);

    const connection = createPromiseConnection();

    try {
        await connection.beginTransaction();

        const [result] = await connection.query<ResultSetHeader>(
            `INSERT INTO crep (exam_code, exam_date, exam_name, print_date, print_duration, contact, authorized_persons, remark, repro_remark, status, registered_by, financial_center, desired_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
            [
                exam.exam_code,
                exam.exam_date,
                exam.exam_name,
                exam.print_date,
                getPrintingDurationInMinutes(getTotalCopies(files)),
                exam.contact,
                exam.authorized_persons,
                exam.remark || null,
                exam.repro_remark || null,
                exam.status || 'registered',
                exam.registered_by,
                exam.financial_center,
                exam.desired_date,
            ]
        );
        const crepId = result.insertId;

        // The files inserted at registration are not logged one by one (see the `crep_file_after_insert` trigger)
        await connection.query('SET @crep_registering = 1;');
        await insertFiles(connection, crepId, files);
        await connection.query('SET @crep_registering = NULL;');

        await connection.commit();
        return crepId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        await connection.end();
    }
}

export async function addCrepFiles(crepId: number, files: NewCrepFile[]): Promise<void> {
    const filesError = validateFilesSpecs(files);
    if (filesError) throw new Error(filesError);

    const connection = createPromiseConnection();

    try {
        await connection.beginTransaction();
        await insertFiles(connection, crepId, files);
        await refreshPrintDuration(connection, crepId);
        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        await connection.end();
    }
}

// Only updates the print settings of the files, returns the printing duration of the exam
export async function updateCrepFileSpecs(crepId: number, files: (CrepFileSpecs & { id: number })[]): Promise<number> {
    const filesError = validateFilesSpecs(files);
    if (filesError) throw new Error(filesError);

    const connection = createPromiseConnection();

    try {
        await connection.beginTransaction();

        const [currentFiles] = await connection.query<RowDataPacket[]>('SELECT id, exam_students FROM crep_file WHERE crep_id = ?;', [crepId]);
        let copiesChanged = false;

        for (const file of files) {
            const specs = pickFileSpecs(file);
            const currentFile = currentFiles.find(({ id }) => id === file.id);
            if (!currentFile) continue;
            if (currentFile.exam_students !== specs.exam_students) copiesChanged = true;

            await connection.query(
                'UPDATE crep_file SET exam_students = ?, exam_pages = ?, paper_format = ?, paper_color = ?, print = ?, need_scan = ? WHERE id = ? AND crep_id = ?;',
                [specs.exam_students, specs.exam_pages, specs.paper_format, specs.paper_color, specs.print, specs.need_scan, file.id, crepId]
            );
        }

        // The duration is only recomputed if the copies changed, so that the frozen duration of the migrated exams is kept
        let printDuration: number;
        if (copiesChanged) {
            printDuration = await refreshPrintDuration(connection, crepId);
        } else {
            const [rows] = await connection.query<RowDataPacket[]>('SELECT print_duration FROM crep WHERE id = ?;', [crepId]);
            printDuration = Number(rows[0].print_duration);
        }

        await connection.commit();
        return printDuration;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        await connection.end();
    }
}

export async function deleteCrepFile(crepId: number, fileId: number): Promise<void> {
    const connection = createPromiseConnection();

    try {
        await connection.beginTransaction();
        await connection.query('DELETE FROM crep_file WHERE id = ? AND crep_id = ?;', [fileId, crepId]);
        await refreshPrintDuration(connection, crepId);
        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        await connection.end();
    }
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
            resolve(attachFiles(rows as CrepExam[]));
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
                resolve(attachFiles(rows as CrepExam[]));
            }
        )
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

export async function updateCrepExamFields(
    examId: string,
    fields: Record<string, string | number | boolean>
) {
    const allowedColumns = [
        'desired_date', 'exam_date', 'financial_center',
        'authorized_persons', 'order_number',
    ];
    const entries = Object.entries(fields).filter(([col]) => allowedColumns.includes(col));
    if (entries.length === 0) return;

    const setClause = entries.map(([col]) => `${col} = ?`).join(', ');
    const params = [...entries.map(([, value]) => value), examId];

    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query(`UPDATE crep SET ${setClause} WHERE id = ?;`, params, (err, rows) => {
            if (err) throw err
            resolve(JSON.stringify(rows));
        })
        connection.end()
    })
}

export async function getCrepExamsByContactEmail(email: string): Promise<CrepExam[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query(
            "SELECT * FROM crep WHERE JSON_UNQUOTE(JSON_EXTRACT(contact, '$.email')) = ? ORDER BY desired_date DESC;",
            [email],
            (err, rows) => {
                if (err) throw err
                resolve(attachFiles(rows as CrepExam[]));
            }
        )
        connection.end()
    })
}

export async function getCrepExamById(id: string): Promise<CrepExam | null> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query('SELECT * FROM crep WHERE id = ? LIMIT 1;', [id], (err, rows) => {
            if (err) throw err
            const arr = rows as CrepExam[];
            resolve(arr.length > 0 ? attachFiles(arr).then(([exam]) => exam) : null);
        })
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
