import os
from contextlib import contextmanager
from typing import Generator, Optional, Any
import uuid
from datetime import datetime, timezone
import json
import psycopg
from psycopg import Connection
from psycopg.rows import dict_row
from pydantic import BaseModel, Field

from .models import ReadingRecord, EvaluationRun, PromptVersion, FeedbackRecord, TrainingExample
from .config import EnvironmentSettings


class PostgresStore:
    def __init__(self, settings: EnvironmentSettings):
        self.settings = settings
        self.connection_params = {
            'host': os.getenv('POSTGRES_HOST', 'localhost'),
            'port': os.getenv('POSTGRES_PORT', '5432'),
            'user': os.getenv('POSTGRES_USER', 'tarot'),
            'password': os.getenv('POSTGRES_PASSWORD', 'tarot123'),
            'dbname': os.getenv('POSTGRES_DB', 'daily_tarot'),
            'row_factory': dict_row,
        }

    @contextmanager
    def connection(self) -> Generator[Connection, None, None]:
        """Context manager for database connections with automatic cleanup"""
        conn = psycopg.connect(**self.connection_params)
        try:
            yield conn
        finally:
            conn.close()

    def fetch_readings(self, limit: int = 1000) -> list[ReadingRecord]:
        """Fetch recent readings for dataset creation"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, user_id, iso_date, spread_type, hmac, intent, cards, 
                           prompt_version, overview, card_breakdowns, synthesis, 
                           actionable_reflection, tone, model, created_at
                    FROM readings
                    ORDER BY created_at DESC
                    LIMIT %s
                """, [limit])
                rows = cur.fetchall()
                return [ReadingRecord(**row) for row in rows]

    def save_evaluation_run(self, run_data: dict[str, Any]) -> None:
        """Save evaluation run results"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO evaluation_runs 
                    (id, prompt_version, dataset_name, metrics, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, [
                    str(uuid.uuid4()),
                    run_data['prompt_version'],
                    run_data['dataset_name'],
                    json.dumps(run_data['metrics']),
                    datetime.now(timezone.utc)
                ])

    def get_prompt_versions(self) -> list[PromptVersion]:
        """Get all prompt versions"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, prompt, active, created_at 
                    FROM prompt_versions 
                    ORDER BY id DESC
                """)
                rows = cur.fetchall()
                return [PromptVersion(**row) for row in rows]

    def save_prompt_version(self, version: int, prompt: str, active: bool = False) -> None:
        """Save a new prompt version"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO prompt_versions (id, prompt, active, created_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        prompt = EXCLUDED.prompt,
                        active = EXCLUDED.active,
                        created_at = EXCLUDED.created_at
                """, [version, prompt, active, datetime.now(timezone.utc)])

    def activate_prompt_version(self, version: int) -> None:
        """Activate a specific prompt version and deactivate others"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                conn.execute("BEGIN")
                try:
                    # Deactivate all versions
                    cur.execute("UPDATE prompt_versions SET active = false")
                    # Activate the specified version
                    cur.execute(
                        "UPDATE prompt_versions SET active = true WHERE id = %s",
                        [version]
                    )
                    conn.execute("COMMIT")
                except Exception:
                    conn.execute("ROLLBACK")
                    raise

    def save_training_dataset(self, name: str, data: list[dict]) -> None:
        """Save training dataset"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO training_datasets (name, data, created_at)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (name) DO UPDATE SET
                        data = EXCLUDED.data,
                        created_at = EXCLUDED.created_at
                """, [name, json.dumps(data), datetime.now(timezone.utc)])

    def fetch_feedback(self, limit: int = 1000) -> list[FeedbackRecord]:
        """Fetch recent feedback for dataset creation"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT reading_id, user_id, rating as thumb, comment as rationale, created_at
                    FROM feedback
                    ORDER BY created_at DESC
                    LIMIT %s
                """, [limit])
                rows = cur.fetchall()
                return [FeedbackRecord(**row) for row in rows]

    def insert_prompt_version(self, prompt_id: str, optimizer: str, status: str = "candidate", metadata: dict = None) -> None:
        """Insert a new prompt version (converted from old system)"""
        version_id = hash(prompt_id) % 1000000  # Generate integer ID from string
        metadata_json = json.dumps(metadata) if metadata else '{}'
        
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO prompt_versions (id, prompt, active, created_at)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        prompt = EXCLUDED.prompt,
                        active = EXCLUDED.active
                """, [version_id, f"Optimizer: {optimizer}, Status: {status}, Metadata: {metadata_json}", False, datetime.now(timezone.utc)])

    def record_evaluation(self, evaluation: 'EvaluationRun') -> None:
        """Record evaluation run results"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                # Convert prompt_version_id string to integer
                version_id = hash(evaluation.prompt_version_id) % 1000000
                metrics_json = json.dumps([metric.model_dump() for metric in evaluation.metrics])
                
                cur.execute("""
                    INSERT INTO evaluation_runs 
                    (id, prompt_version, dataset_name, metrics, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                """, [
                    str(uuid.uuid4()),
                    version_id,
                    evaluation.dataset,
                    metrics_json,
                    evaluation.created_at
                ])

    def get_training_dataset(self, name: str) -> Optional[list[dict]]:
        """Get training dataset by name"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT data FROM training_datasets WHERE name = %s
                """, [name])
                row = cur.fetchone()
                return json.loads(row['data']) if row else None

    def append_training_examples(self, dataset_name: str, examples: list['TrainingExample']) -> None:
        """Save training dataset (method name compatibility)"""
        data = [example.model_dump() for example in examples]
        self.save_training_dataset(dataset_name, data)

    def get_evaluation_runs(self, prompt_version: Optional[int] = None) -> list[EvaluationRun]:
        """Get evaluation runs, optionally filtered by prompt version"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                if prompt_version:
                    cur.execute("""
                        SELECT id, prompt_version, dataset_name, metrics, created_at
                        FROM evaluation_runs
                        WHERE prompt_version = %s
                        ORDER BY created_at DESC
                    """, [prompt_version])
                else:
                    cur.execute("""
                        SELECT id, prompt_version, dataset_name, metrics, created_at
                        FROM evaluation_runs
                        ORDER BY created_at DESC
                    """)
                rows = cur.fetchall()
                return [EvaluationRun(**row) for row in rows]

    def initialize_schema(self) -> None:
        """Initialize database schema if it doesn't exist"""
        with self.connection() as conn:
            with conn.cursor() as cur:
                # Create enum types if they don't exist
                cur.execute("""
                    DO $$ BEGIN
                        CREATE TYPE spread_type_enum AS ENUM ('single', 'three_card', 'celtic_cross');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                """)
                
                cur.execute("""
                    DO $$ BEGIN
                        CREATE TYPE tone_enum AS ENUM ('reflective', 'direct', 'inspirational', 'cautious');
                    EXCEPTION
                        WHEN duplicate_object THEN null;
                    END $$;
                """)

                # Create tables if they don't exist
                self._create_tables(cur)
                conn.commit()

    def _create_tables(self, cur) -> None:
        """Create all necessary tables"""
        # Users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # Sessions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                csrf_token TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # User keys table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_keys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                provider TEXT NOT NULL,
                provider_user_id TEXT NOT NULL,
                hashed_secret TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(provider, provider_user_id)
            )
        """)

        # Readings table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS readings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                iso_date TEXT NOT NULL,
                spread_type spread_type_enum NOT NULL,
                hmac TEXT NOT NULL UNIQUE,
                intent TEXT NOT NULL,
                cards JSONB NOT NULL,
                prompt_version INTEGER,
                overview TEXT NOT NULL,
                card_breakdowns JSONB NOT NULL,
                synthesis TEXT NOT NULL,
                actionable_reflection TEXT NOT NULL,
                tone tone_enum,
                model TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # Feedback table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS feedback (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                reading_id UUID NOT NULL REFERENCES readings(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE SET NULL,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                category TEXT,
                comment TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # Prompt versions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS prompt_versions (
                id INTEGER PRIMARY KEY,
                prompt TEXT NOT NULL,
                active BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # Evaluation runs table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS evaluation_runs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                prompt_version INTEGER NOT NULL REFERENCES prompt_versions(id),
                dataset_name TEXT NOT NULL,
                metrics JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # Training datasets table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS training_datasets (
                name TEXT PRIMARY KEY,
                data JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # Push subscriptions table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                endpoint TEXT NOT NULL,
                keys JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                UNIQUE(endpoint)
            )
        """)

        # Alerts table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                metadata JSONB,
                acknowledged BOOLEAN NOT NULL DEFAULT false,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """)

        # Create indexes for better performance
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at DESC)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)",
            "CREATE INDEX IF NOT EXISTS idx_feedback_reading_id ON feedback(reading_id)",
        ]

        for index_sql in indexes:
            cur.execute(index_sql)