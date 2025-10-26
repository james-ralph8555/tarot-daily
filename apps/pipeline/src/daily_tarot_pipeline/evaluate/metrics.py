from __future__ import annotations

from typing import Callable, Iterable

from ..models import TrainingExample


MetricFn = Callable[[TrainingExample], float]


def card_coverage_metric(example: TrainingExample) -> float:
    mentioned = 0
    for card in example.card_breakdowns:
        if card.card_id.lower() in example.overview.lower():
            mentioned += 1
    if not example.card_breakdowns:
        return 0.0
    return mentioned / len(example.card_breakdowns)


def disclaimer_metric(example: TrainingExample) -> float:
    text = (example.actionable_reflection or "") + " " + (example.overview or "")
    if "entertainment" in text.lower() and "advice" in text.lower():
        return 1.0
    return 0.0


def composite_metric(example: TrainingExample) -> float:
    return 0.7 * card_coverage_metric(example) + 0.3 * disclaimer_metric(example)


def evaluate_dataset(examples: Iterable[TrainingExample], metric: MetricFn = composite_metric) -> float:
    scores = [metric(example) for example in examples]
    if not scores:
        return 0.0
    return sum(scores) / len(scores)
