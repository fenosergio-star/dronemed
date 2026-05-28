import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

let pool: mysql.Pool;

export async function initMySQL(): Promise<mysql.Pool> {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'droneadmin',
    password: process.env.DB_PASSWORD || 'DroneMed2035!',
    database: process.env.DB_NAME || 'drone_med_mada',
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    charset: 'utf8mb4',
  });

  const schemaPath = path.join(__dirname, 'schema-mysql.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    const conn = await pool.getConnection();
    try {
      for (const stmt of statements) {
        if (stmt.toUpperCase().startsWith('CREATE')) {
          await conn.execute(stmt);
        }
      }
    } finally {
      conn.release();
    }
  }

  console.log('[MySQL] Connecté à la base drone_med_mada');
  return pool;
}

export function getMySQLPool(): mysql.Pool {
  if (!pool) throw new Error('MySQL non initialisé');
  return pool;
}
