import Database from 'better-sqlite3';
import { getDbConfig } from '../config/dbConfig';

export class DbService {
  private readonly db: Database.Database;

  constructor(filePath?: string) {
    const config = getDbConfig();
    this.db = new Database(filePath ?? config.filePath);
  }

  migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `);
  }

  run(sql: string, params: unknown[] = []): Database.RunResult {
    return this.db.prepare(sql).run(...params);
  }

  queryAll<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  queryOne<T = Record<string, unknown>>(sql: string, params: unknown[] = []): T | undefined {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  close(): void {
    this.db.close();
  }
}
