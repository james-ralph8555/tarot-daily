from __future__ import annotations

from pathlib import Path
from typing import Iterable

import dspy

from ..config import get_settings
from ..models import TrainingExample, PromptCandidate


class TarotReadingSignature(dspy.Signature):
    """DSPy signature describing the tarot reading task."""

    intent = dspy.InputField(desc="Optional user intent for today's reading.")
    spread_type = dspy.InputField(desc="Spread layout (single, three-card, celtic-cross).")
    cards = dspy.InputField(desc="Card IDs with orientation and position information.")
    tone = dspy.InputField(desc="Desired tone coaxed from user preferences.")

    overview = dspy.OutputField(desc="High-level synthesis referencing all cards.")
    card_breakdowns = dspy.OutputField(desc="Per-card breakdown array with summaries.")
    synthesis = dspy.OutputField(desc="Connecting thread across the spread.")
    actionable_reflection = dspy.OutputField(desc="Reflection prompt encouraging grounded action.")
    disclaimer = dspy.OutputField(desc="Explicit entertainment disclaimer and guardrails.")


class TarotReadingModule(dspy.Module):
    def __init__(self, prompt_path: Path | None = None):
        super().__init__()
        self.prompt_path = prompt_path
        self.generator = dspy.Predict(TarotReadingSignature)

    def forward(self, intent: str | None, spread_type: str, cards: list[dict], tone: str):
        return self.generator(intent=intent, spread_type=spread_type, cards=cards, tone=tone)

    def export_prompt(self, target_path: Path) -> None:
        prompt = self.generator.prompt
        target_path.write_text(prompt, encoding="utf-8")


def run_mipro(training_examples: Iterable[TrainingExample], output_dir: Path) -> PromptCandidate:
    """Run a MIPROv2 optimizer over collected training examples."""

    settings = get_settings()
    lm = dspy.LM(
        model=settings.groq_dev_model,
        api_base=settings.groq_api_base,
        api_key=settings.groq_api_key,
        max_tokens=800,
    )
    dspy.settings.configure(lm=lm)

    module = TarotReadingModule()
    optimizer = dspy.MIPROv2(metric=lambda gold, pred: _metric_fn(gold, pred), init_temperature=0.7)

    dataset = [
        {
            "input": {
                "intent": example.intent,
                "spread_type": example.spread_type,
                "cards": [card.model_dump() for card in example.cards],
                "tone": example.tone,
            },
            "output": {
                "overview": example.overview,
                "card_breakdowns": [item.model_dump() for item in example.card_breakdowns],
                "synthesis": example.synthesis,
                "actionable_reflection": example.actionable_reflection,
                "disclaimer": "For reflection and entertainment; not medical or financial advice.",
            },
        }
        for example in training_examples
    ]

    result = optimizer.compile(module, trainset=dataset)

    output_dir.mkdir(parents=True, exist_ok=True)
    prompt_path = output_dir / "prompt.txt"
    module.export_prompt(prompt_path)

    return PromptCandidate(prompt_path=str(prompt_path), optimizer="MIPROv2", loss=result.loss)


def _metric_fn(gold: dict, pred: dict) -> float:
    score = 0.0
    if gold.get("overview") and pred.get("overview"):
        score += _overlap_score(gold["overview"], pred["overview"])
    return score


def _overlap_score(gold: str, pred: str) -> float:
    gold_tokens = set(gold.lower().split())
    pred_tokens = set(pred.lower().split())
    if not gold_tokens:
        return 0.0
    return len(gold_tokens & pred_tokens) / len(gold_tokens)
