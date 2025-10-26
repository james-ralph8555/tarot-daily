import duckdb from "duckdb";
import fs from "node:fs";
import path from "node:path";
import { duckDbTables } from "@daily-tarot/common";

const DEFAULT_DB_PATH = path.resolve(process.cwd(), "var/data/tarot.duckdb");

let dbInstance: duckdb.Database | null = null;

export function getDb(): duckdb.Database {
  if (!dbInstance) {
    const dbPath = process.env.DUCKDB_PATH ? path.resolve(process.cwd(), process.env.DUCKDB_PATH) : DEFAULT_DB_PATH;
    ensureDirectory(path.dirname(dbPath));
    dbInstance = new duckdb.Database(dbPath);
    initializeSchema(dbInstance);
  }
  return dbInstance;
}

function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function initializeSchema(db: duckdb.Database) {
  const conn = db.connect();
  try {
    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.users} (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE NOT NULL,
        hashed_password VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.sessions} (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        csrf_token VARCHAR NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES ${duckDbTables.users}(id)
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.userKeys} (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        hashed_password VARCHAR,
        provider_id VARCHAR NOT NULL,
        provider_user_id VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES ${duckDbTables.users}(id)
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.readings} (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        iso_date VARCHAR NOT NULL,
        spread_type VARCHAR NOT NULL,
        hmac VARCHAR NOT NULL,
        intent VARCHAR,
        cards JSON NOT NULL,
        prompt_version VARCHAR NOT NULL,
        overview TEXT NOT NULL,
        card_breakdowns JSON NOT NULL,
        synthesis TEXT NOT NULL,
        actionable_reflection TEXT NOT NULL,
        tone VARCHAR NOT NULL,
        model VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL,
        UNIQUE(user_id, iso_date)
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.feedback} (
        reading_id VARCHAR NOT NULL,
        user_id VARCHAR NOT NULL,
        thumb INTEGER NOT NULL,
        rationale TEXT,
        created_at TIMESTAMP NOT NULL,
        PRIMARY KEY (reading_id, user_id),
        FOREIGN KEY (reading_id) REFERENCES ${duckDbTables.readings}(id)
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.prompts} (
        id VARCHAR PRIMARY KEY,
        status VARCHAR NOT NULL,
        optimizer VARCHAR NOT NULL,
        metadata JSON,
        created_at TIMESTAMP NOT NULL
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.evaluations} (
        id VARCHAR PRIMARY KEY,
        prompt_version_id VARCHAR NOT NULL,
        dataset VARCHAR NOT NULL,
        metrics JSON NOT NULL,
        guardrail_violations JSON NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (prompt_version_id) REFERENCES ${duckDbTables.prompts}(id)
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.pushSubscriptions} (
        user_id VARCHAR NOT NULL,
        endpoint VARCHAR PRIMARY KEY,
        expiration_time BIGINT,
        keys JSON NOT NULL,
        created_at TIMESTAMP NOT NULL
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS training_datasets (
        dataset VARCHAR NOT NULL,
        payload JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.alerts} (
        id VARCHAR PRIMARY KEY,
        kind VARCHAR NOT NULL,
        payload JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    conn.close();
  }
}

export interface QueryOptions {
  params?: unknown[];
}

export function query<T = unknown>(sql: string, options: QueryOptions = {}): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDb().all(sql, options.params ?? [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows as T[]);
      }
    });
  });
}

export function run(sql: string, options: QueryOptions = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    getDb().run(sql, options.params ?? [], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
