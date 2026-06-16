'use server';
import mysql from 'mysql2';
import type { ResultSetHeader } from 'mysql2';
import { Service } from '@/types/service';
import { ExamType } from '@/types/examType';
import { AcademicYear, FormattedAcademicYear } from '@/types/academicYear';
import { FormattedSection, Section } from '@/types/section';
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
