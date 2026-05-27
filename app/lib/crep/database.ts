'use server';

import mysql, { ResultSetHeader } from 'mysql2';
import { examBlockingPrintStatus, examNotAdminStatus } from '../examStatus';
import { CrepExam } from '@/types/crepExam';
import { formatDateTimeForDatabase } from '../dateTime';

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
