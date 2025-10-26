import { DuckDBInstance, DuckDBValue } from "@duckdb/node-api";
import fs from "node:fs";
import path from "node:path";
import { duckDbTables } from "@daily-tarot/common";

const DEFAULT_DB_PATH = path.resolve(process.cwd(), "var/data/tarot.duckdb");

let dbInstance: DuckDBInstance | null = null;

export async function getDb(): Promise<DuckDBInstance> {
  if (!dbInstance) {
    const dbPath = process.env.DUCKDB_PATH ? path.resolve(process.cwd(), process.env.DUCKDB_PATH) : DEFAULT_DB_PATH;
    ensureDirectory(path.dirname(dbPath));
    dbInstance = await DuckDBInstance.create(dbPath);
    await initializeSchema(dbInstance);
  }
  return dbInstance;
}

function ensureDirectory(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function initializeSchema(db: DuckDBInstance) {
  const conn = await db.connect();
  try {
    await conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.users} (
        id VARCHAR PRIMARY KEY,
        email VARCHAR UNIQUE NOT NULL,
        hashed_password VARCHAR NOT NULL,
        created_at TIMESTAMP NOT NULL
      );
    `);

    await conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.sessions} (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        csrf_token VARCHAR NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES ${duckDbTables.users}(id)
      );
    `);

    await conn.run(`
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

    await conn.run(`
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
        created_at TIMESTAMP NOT NULL
      );
    `);

    await conn.run(`
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

    await conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.prompts} (
        id VARCHAR PRIMARY KEY,
        status VARCHAR NOT NULL,
        optimizer VARCHAR NOT NULL,
        metadata JSON,
        version VARCHAR DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP NOT NULL
      );
    `);

    await conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.evaluations} (
        id VARCHAR PRIMARY KEY,
        prompt_version_id VARCHAR NOT NULL,
        dataset VARCHAR NOT NULL,
        metrics JSON NOT NULL,
        guardrail_violations JSON,
        sample_size INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL,
        FOREIGN KEY (prompt_version_id) REFERENCES ${duckDbTables.prompts}(id)
      );
    `);

    await conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.pushSubscriptions} (
        user_id VARCHAR NOT NULL,
        endpoint VARCHAR PRIMARY KEY,
        expiration_time BIGINT,
        keys JSON NOT NULL,
        created_at TIMESTAMP NOT NULL
      );
    `);

    await conn.run(`
      CREATE TABLE IF NOT EXISTS training_datasets (
        dataset VARCHAR NOT NULL,
        payload JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await conn.run(`
      CREATE TABLE IF NOT EXISTS ${duckDbTables.alerts} (
        id VARCHAR PRIMARY KEY,
        kind VARCHAR NOT NULL,
        payload JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } finally {
    conn.closeSync();
  }
}

export interface QueryOptions {
  params?: DuckDBValue[];
}

export async function query<T = unknown>(sql: string, options: QueryOptions = {}): Promise<T[]> {
  const db = await getDb();
  const conn = await db.connect();
  try {
    // Convert parameters to proper DuckDB types to avoid ANY type errors
    const params = options.params?.map(param => {
      if (param === null || param === undefined) return null;
      if (typeof param === 'string') return param;
      if (typeof param === 'number') return param;
      if (typeof param === 'boolean') return param;
      if (param instanceof Date) return param.toISOString();
      // Convert objects to JSON strings to avoid ANY type
      if (typeof param === 'object') return JSON.stringify(param);
      return String(param);
    }) || [];
    
    const reader = await conn.runAndReadAll(sql, params);
    return reader.getRowObjectsJson() as T[];
  } finally {
    conn.closeSync();
  }
}

export async function run(sql: string, options: QueryOptions = {}): Promise<void> {
  const db = await getDb();
  const conn = await db.connect();
  try {
    // Convert parameters to proper DuckDB types to avoid ANY type errors
    const params = options.params?.map(param => {
      if (param === null || param === undefined) return null;
      if (typeof param === 'string') return param;
      if (typeof param === 'number') return param;
      if (typeof param === 'boolean') return param;
      if (param instanceof Date) return param.toISOString();
      // Convert objects to JSON strings to avoid ANY type
      if (typeof param === 'object') return JSON.stringify(param);
      return String(param);
    }) || [];
    
    console.log('Running SQL:', sql);
    console.log('With params:', params);
    await conn.run(sql, params);
  } catch (err) {
    console.error('SQL Error:', err);
    throw err;
  } finally {
    conn.closeSync();
  }
}
