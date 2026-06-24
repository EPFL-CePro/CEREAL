'use server';
import mysql from 'mysql2';
import type { ResultSetHeader } from 'mysql2';
import { Service } from '@/types/service';
import { ExamType } from '@/types/examType';
import { Exam, NewExam } from '@/types/exam';
import { ServiceLevel } from '@/types/serviceLevel';
import { ExamStatus } from '@/types/examStatus';

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

export async function insertService(service: Omit<Service, 'id'>): Promise<number> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise((resolve, reject) => {
        connection.query(
            'INSERT INTO service (code, description) VALUES (?, ?);',
            [service.code, service.description],
            (err, result) => {
                if (err) return reject(err)
                resolve((result as ResultSetHeader).insertId as number)
            }
        )
        connection.end()
    })
}

export async function deleteService(service: Service) {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise((resolve) => {
        connection.query(
            'DELETE FROM service WHERE id = ?;',
            [service.id],
            (err, rows) => {
                if (err) throw err
                resolve(JSON.stringify(rows));
            }
        )
        connection.end()
    })
}

export async function insertServiceLevel(serviceLevel: Omit<ServiceLevel, 'id'>): Promise<number> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise((resolve, reject) => {
        connection.query(
            'INSERT INTO service_level (code, name) VALUES (?, ?);',
            [serviceLevel.code, serviceLevel.name],
            (err, result) => {
                if (err) return reject(err)
                resolve((result as ResultSetHeader).insertId as number)
            }
        )
        connection.end()
    })
}

export async function insertExamStatus(examStatus: Omit<ExamStatus, 'id'>): Promise<number> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise((resolve, reject) => {
        connection.query(
            'INSERT INTO exam_status (code, name, color) VALUES (?, ?, ?);',
            [examStatus.code, examStatus.name, examStatus.color],
            (err, result) => {
                if (err) return reject(err)
                resolve((result as ResultSetHeader).insertId as number)
            }
        )
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
        const sql = `INSERT INTO exam (code, name, service_level_id, service_id, exam_type_id, exam_status_id, exam_date, academic_year_id, exam_semester, nb_students, nb_pages, total_pages, remark, responsible_id, contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;

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

        connection.query(sql, params, (err, result) => {
            if (err) return reject(err);
            resolve((result as ResultSetHeader).insertId as number);
        });
        connection.end();
    });
}

export async function getAcademicYearsFromExams(): Promise<string[]> {
    const connection = mysql.createConnection({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

    connection.connect()

    return new Promise(function(resolve) {
        connection.query(
            'SELECT DISTINCT academic_year_id FROM exam WHERE academic_year_id IS NOT NULL AND academic_year_id <> "" ORDER BY academic_year_id ASC;',
            (err, rows: { academic_year_id: string }[]) => {
                if (err) throw err
                resolve(rows.map((row) => row.academic_year_id));
            }
        )
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
        connection.query('SELECT exam.* FROM exam WHERE exam.academic_year_id = ?;', [academicYear], (err, rows) => {
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

export async function updateExamResponsible(examId: string, responsibleId: number | null) {
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
