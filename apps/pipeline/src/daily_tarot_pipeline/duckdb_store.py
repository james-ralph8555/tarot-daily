from __future__ import annotations

import json
from contextlib import contextmanager
from typing import Iterable

import duckdb

from .config import get_settings
from .models import FeedbackRecord, ReadingRecord, EvaluationRun, TrainingExample


class DuckDBStore:
    def __init__(self, database_path: str | None = None):
        settings = get_settings()
        self.database_path = str(database_path or settings.duckdb_path)

    @contextmanager
    def connection(self):
        con = duckdb.connect(self.database_path, read_only=False)
        try:
            yield con
        finally:
            con.close()

    def fetch_feedback(self, limit: int = 1000) -> list[FeedbackRecord]:
        with self.connection() as con:
            rows = con.execute(
                """
                SELECT reading_id, user_id, thumb, rationale, created_at
                FROM feedback
                ORDER BY created_at DESC
                LIMIT ?
                """,
                [limit],
            ).fetchall()
        return [
            FeedbackRecord(
                reading_id=row[0],
                user_id=row[1],
                thumb=row[2],
                rationale=row[3],
                created_at=row[4],
            )
            for row in rows
        ]

    def fetch_readings(self, limit: int = 1000) -> list[ReadingRecord]:
        with self.connection() as con:
            rows = con.execute(
                """
                SELECT
                    id,
                    user_id,
                    iso_date,
                    spread_type,
                    hmac,
                    intent,
                    cards,
                    prompt_version,
                    overview,
                    card_breakdowns,
                    synthesis,
                    actionable_reflection,
                    tone,
                    model,
                    created_at
                FROM readings
                ORDER BY created_at DESC
                LIMIT ?
                """,
                [limit],
            ).fetchall()
        readings: list[ReadingRecord] = []
        for row in rows:
            readings.append(
                ReadingRecord(  # type: ignore[arg-type]
                    id=row[0],
                    user_id=row[1],
                    iso_date=row[2],
                    spread_type=row[3],
                    hmac=row[4],
                    intent=row[5],
                    cards=json.loads(row[6]),
                    prompt_version=row[7],
                    overview=row[8],
                    card_breakdowns=json.loads(row[9]),
                    synthesis=row[10],
                    actionable_reflection=row[11],
                    tone=row[12],
                    model=row[13],
                    created_at=row[14],
                )
            )
        return readings

    def append_training_examples(self, dataset_name: str, examples: Iterable[TrainingExample]) -> None:
        data = [json.dumps(example.model_dump(mode="json")) for example in examples]
        with self.connection() as con:
            con.execute(
                """
                CREATE TABLE IF NOT EXISTS training_datasets AS
                SELECT * FROM (SELECT NULL AS dataset, NULL AS payload) WHERE 1=0;
                """
            )
            con.executemany(
                """INSERT INTO training_datasets (dataset, payload) VALUES (?, ?)""",
                [(dataset_name, example) for example in data],
            )

    def insert_prompt_version(self, prompt_version: str, optimizer: str, status: str = "candidate") -> None:
        with self.connection() as con:
            con.execute(
                """
                INSERT INTO prompt_versions (id, status, optimizer, metadata, created_at)
                VALUES (?, ?, ?, '{}', CURRENT_TIMESTAMP)
                ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, optimizer = EXCLUDED.optimizer
                """,
                [prompt_version, status, optimizer],
            )

    def record_evaluation(self, evaluation: EvaluationRun) -> None:
        with self.connection() as con:
            con.execute(
                """
                INSERT INTO evaluation_runs (id, prompt_version_id, dataset, metrics, guardrail_violations, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                [
                    evaluation.id,
                    evaluation.prompt_version_id,
                    evaluation.dataset,
                    json.dumps([metric.model_dump() for metric in evaluation.metrics]),
                    json.dumps(evaluation.guardrail_violations),
                    evaluation.created_at,
                ],
            )

    def latest_prompt_versions(self, limit: int = 5) -> list[str]:
        with self.connection() as con:
            rows = con.execute(
                """
                SELECT id
                FROM prompt_versions
                ORDER BY created_at DESC
                LIMIT ?
                """,
                [limit],
            ).fetchall()
        return [row[0] for row in rows]
