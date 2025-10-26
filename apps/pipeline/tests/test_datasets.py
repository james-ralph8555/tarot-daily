from datetime import datetime
from typing import List

from daily_tarot_pipeline.datasets import build_training_examples
from daily_tarot_pipeline.models import CardBreakdown, CardDraw, FeedbackRecord, ReadingRecord


class FakeStore:
    def __init__(self, readings: List[ReadingRecord], feedback: List[FeedbackRecord]):
        self._readings = readings
        self._feedback = feedback

    def fetch_readings(self, limit: int = 1000):
        return self._readings

    def fetch_feedback(self, limit: int = 1000):
        return self._feedback


def test_build_training_examples_merges_feedback():
    reading = ReadingRecord(
        id="r1",
        user_id="u1",
        iso_date="2024-04-01",
        spread_type="three-card",
        hmac="seed",
        intent="Clarity",
        cards=[CardDraw(card_id="major-00", orientation="upright", position="past")],
        prompt_version="v1",
        overview="The Fool opens possibilities.",
        card_breakdowns=[CardBreakdown(card_id="major-00", orientation="upright", summary="New journey")],
        synthesis="Trust the start.",
        actionable_reflection="Take one concrete step.",
        tone="warm",
        model="groq/openai/gpt-oss-20b",
        created_at=datetime.utcnow(),
    )
    feedback = FeedbackRecord(
        reading_id="r1",
        user_id="u1",
        thumb=1,
        rationale="Accurate",
        created_at=datetime.utcnow(),
    )
    store = FakeStore([reading], [feedback])
    examples = build_training_examples(store)
    assert len(examples) == 1
    example = examples[0]
    assert example.feedback_thumb == 1
    assert example.feedback_rationale == "Accurate"
