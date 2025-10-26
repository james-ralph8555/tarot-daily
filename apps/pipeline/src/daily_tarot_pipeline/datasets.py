from __future__ import annotations

from typing import Iterable

from .postgres_store import PostgresStore
from .models import FeedbackRecord, ReadingRecord, TrainingExample


def build_training_examples(
    store: PostgresStore,
    limit: int = 2000,
    include_negative: bool = True,
) -> list[TrainingExample]:
    readings = store.fetch_readings(limit)
    feedback = store.fetch_feedback(limit)

    feedback_map: dict[str, FeedbackRecord] = {}
    for item in feedback:
        existing = feedback_map.get(item.reading_id)
        if not existing or existing.created_at < item.created_at:
            feedback_map[item.reading_id] = item

    examples: list[TrainingExample] = []
    for reading in readings:
        fb = feedback_map.get(reading.id)
        if fb is None and include_negative is False:
            continue
        examples.append(_to_training_example(reading, fb))
    return examples


def persist_dataset(store: PostgresStore, dataset_name: str, examples: Iterable[TrainingExample]) -> None:
    store.append_training_examples(dataset_name, examples)


def _to_training_example(reading: ReadingRecord, feedback: FeedbackRecord | None) -> TrainingExample:
    return TrainingExample(
        intent=reading.intent,
        spread_type=reading.spread_type,
        cards=reading.cards,
        overview=reading.overview,
        card_breakdowns=reading.card_breakdowns,
        synthesis=reading.synthesis,
        actionable_reflection=reading.actionable_reflection,
        tone=reading.tone,
        feedback_thumb=feedback.thumb if feedback else None,
        feedback_rationale=feedback.rationale if feedback else None,
        prompt_version=reading.prompt_version,
    )
