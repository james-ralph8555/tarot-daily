import { Pool, PoolClient } from 'pg';
import path from 'path';
import { z } from 'zod';

interface QueryOptions {
  params?: unknown[];
}

// Connection pool configuration
const poolConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  user: process.env.POSTGRES_USER || 'tarot',
  password: process.env.POSTGRES_PASSWORD || 'tarot123',
  database: process.env.POSTGRES_DB || 'daily_tarot',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

let pool: Pool;

export async function getDb(): Promise<Pool> {
  if (!pool) {
    pool = new Pool(poolConfig);
    
    // Test the connection
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      await initializeSchema(client);
    } finally {
      client.release();
    }
  }
  return pool;
}

// Helper function to execute queries with proper typing
export async function query<T = unknown>(sql: string, options: QueryOptions = {}): Promise<T[]> {
  const db = await getDb();
  const client = await db.connect();
  try {
    const result = await client.query(sql, options.params || []);
    return result.rows;
  } finally {
    client.release();
  }
}

// Helper function to execute write operations
export async function run(sql: string, options: QueryOptions = {}): Promise<void> {
  const db = await getDb();
  const client = await db.connect();
  try {
    await client.query(sql, options.params || []);
  } finally {
    client.release();
  }
}

// Initialize database schema
async function initializeSchema(client: PoolClient): Promise<void> {
  // User management tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT NOT NULL UNIQUE,
      hashed_password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS user_keys (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT NOT NULL,
      hashed_secret TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(provider, provider_user_id)
    )
  `);

  // Tarot reading tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS readings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      iso_date TEXT NOT NULL,
      spread_type TEXT NOT NULL,
      hmac TEXT NOT NULL UNIQUE,
      intent TEXT NOT NULL,
      cards JSONB NOT NULL,
      prompt_version INTEGER,
      overview TEXT NOT NULL,
      card_breakdowns JSONB NOT NULL,
      synthesis TEXT NOT NULL,
      actionable_reflection TEXT NOT NULL,
      tone TEXT,
      model TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reading_id UUID NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      rating INTEGER CHECK (rating >= 1 AND rating <= 5),
      category TEXT,
      comment TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ML optimization tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS prompt_versions (
      id INTEGER PRIMARY KEY,
      prompt TEXT NOT NULL,
      active BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS evaluation_runs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prompt_version INTEGER NOT NULL REFERENCES prompt_versions(id),
      dataset_name TEXT NOT NULL,
      metrics JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS training_datasets (
      name TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Push notification table
  await client.query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT NOT NULL,
      keys JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(endpoint)
    )
  `);

  // Alert system table
  await client.query(`
    CREATE TABLE IF NOT EXISTS alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      metadata JSONB,
      acknowledged BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Create indexes for better performance
  await client.query('CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at DESC)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)');
  await client.query('CREATE INDEX IF NOT EXISTS idx_feedback_reading_id ON feedback(reading_id)');
}

// Export types for use in other modules
export type { PoolClient };