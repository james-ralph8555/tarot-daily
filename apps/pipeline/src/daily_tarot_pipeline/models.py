from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

CardOrientation = Literal["upright", "reversed"]
ModelName = Literal["groq/openai/gpt-oss-20b", "groq/openai/gpt-oss-120b"]
SpreadType = Literal["single", "three-card", "celtic-cross"]


class CardDraw(BaseModel):
    card_id: str = Field(..., alias="cardId")
    orientation: CardOrientation
    position: str


class CardBreakdown(BaseModel):
    card_id: str = Field(..., alias="cardId")
    orientation: CardOrientation
    summary: str


class ReadingRecord(BaseModel):
    id: str
    user_id: str
    iso_date: str
    spread_type: SpreadType
    hmac: str
    intent: str | None
    cards: list[CardDraw]
    prompt_version: str
    overview: str
    card_breakdowns: list[CardBreakdown]
    synthesis: str
    actionable_reflection: str
    tone: str
    model: ModelName
    created_at: datetime


class FeedbackRecord(BaseModel):
    reading_id: str
    user_id: str
    thumb: Literal[-1, 1]
    rationale: str | None
    created_at: datetime


class TrainingExample(BaseModel):
    intent: str | None
    spread_type: SpreadType
    cards: list[CardDraw]
    overview: str
    card_breakdowns: list[CardBreakdown]
    synthesis: str
    actionable_reflection: str
    tone: str
    feedback_thumb: Literal[-1, 1] | None = None
    feedback_rationale: str | None = None
    prompt_version: str


class MetricResult(BaseModel):
    name: str
    value: float
    threshold: float | None = None


class EvaluationRun(BaseModel):
    id: str
    prompt_version_id: str
    dataset: str
    metrics: list[MetricResult]
    guardrail_violations: list[str]
    created_at: datetime


class PromptVersion(BaseModel):
    id: int
    prompt: str
    active: bool
    created_at: datetime


class PromptCandidate(BaseModel):
    prompt_path: str
    optimizer: str
    loss: float | None = None
