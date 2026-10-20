import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as { dbPool: mysql.Pool };

export const db = globalForDb.dbPool ||
    mysql.createPool({
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
        database: process.env.MYSQL_DATABASE,
    })

if (process.env.NODE_ENV !== 'production') globalForDb.dbPool = db;