// @ts-ignore
import initSqlJs from 'sql.js';

type SqlJsDatabase = any;
import fs from 'fs';
import path from 'path';

let db: SqlJsDatabase;

export async function initSQLite(dbPath?: string): Promise<SqlJsDatabase> {
  const finalPath = dbPath || path.join(__dirname, '..', '..', 'data', 'drone-cache.db');
  const dir = path.dirname(finalPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const SQL = await initSqlJs();

  if (fs.existsSync(finalPath)) {
    const buffer = fs.readFileSync(finalPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode=WAL');
  db.run('PRAGMA foreign_keys=ON');

  const schemaPath = path.join(__dirname, 'schema-sqlite.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.run(schema);
  }

  saveToFile(finalPath);
  console.log(`[SQLite] Base initialisée: ${finalPath}`);
  return db;
}

export function getSQLiteDB(): SqlJsDatabase {
  if (!db) throw new Error('SQLite non initialisé');
  return db;
}

export function saveToFile(filePath?: string): void {
  const finalPath = filePath || path.join(__dirname, '..', '..', 'data', 'drone-cache.db');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(finalPath, buffer);
}

export function closeSQLite(): void {
  if (db) {
    saveToFile();
    db.close();
  }
}
