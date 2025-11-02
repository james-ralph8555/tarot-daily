from __future__ import annotations

from pathlib import Path
from typing import Iterable

import dspy

from ..config import get_settings
from ..models import TrainingExample, PromptCandidate


class TarotReadingSignature(dspy.Signature):
    """Generate personalized tarot readings with structured output."""
    
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
        # Export the full module state as JSON representation
        import json
        state = self.generator.dump_state()
        prompt = json.dumps(state, indent=2, default=str)
        target_path.write_text(prompt, encoding="utf-8")


def run_mipro(training_examples: Iterable[TrainingExample], output_dir: Path) -> PromptCandidate:
    """Run a MIPROv2 optimizer over collected training examples with enhanced MLflow tracking."""

    import uuid
    from datetime import datetime
    from ..postgres_store import PostgresStore

    settings = get_settings()
    lm = dspy.LM(
        model=settings.groq_dev_model,
        api_base=settings.groq_api_base,
        api_key=settings.groq_api_key,
        max_tokens=2000,
    )
    dspy.settings.configure(lm=lm)

    module = TarotReadingModule()
    
    # Enhanced optimizer configuration with proper metrics
    optimizer = dspy.MIPROv2(
        metric=lambda gold, pred: _metric_fn(gold, pred), 
        init_temperature=0.7,
        auto="light"  # Use light mode for faster optimization
    )

    dataset = [
        dspy.Example(
            intent=example.intent,
            spread_type=example.spread_type,
            cards=[card.model_dump() for card in example.cards],
            tone=example.tone,
            overview=example.overview,
            card_breakdowns=[item.model_dump() for item in example.card_breakdowns],
            synthesis=example.synthesis,
            actionable_reflection=example.actionable_reflection,
            disclaimer="For reflection and entertainment; not medical or financial advice.",
        ).with_inputs("intent", "spread_type", "cards", "tone")
        for example in training_examples
    ]

    # Generate a unique ID for this prompt version
    prompt_version_id = str(uuid.uuid4())
    
    # Insert the prompt version into the database and get the actual integer ID
    store = PostgresStore(get_settings())
    actual_prompt_version_id = store.insert_prompt_version(
        prompt_version_id, 
        optimizer="MIPROv2", 
        status="candidate",
        metadata={
            "init_temperature": 0.7,
            "max_tokens": 2000,
            "model": settings.groq_dev_model,
            "training_examples_count": len(list(training_examples)),
            "auto": "light",
            "num_candidates": 3
        }
    )

    # Split data for training and evaluation
    eval_size = max(1, len(dataset) // 5)  # Use 20% for evaluation
    trainset = dataset[:-eval_size]
    evalset = dataset[-eval_size:]

    # Compile the module - this will be automatically logged due to MLflow autologging
    result = optimizer.compile(module, trainset=trainset, valset=evalset)

    output_dir.mkdir(parents=True, exist_ok=True)
    prompt_path = output_dir / "prompt.txt"
    result.export_prompt(prompt_path)

    # Evaluate the compiled module with MLflow tracking
    from ..mlflow_tracker import get_mlflow_tracker
    tracker = get_mlflow_tracker("mipro-optimization")
    
    # Run DSPy evaluation with automatic logging
    eval_scores = tracker.log_dspy_evaluation(evalset, result, _metric_fn)
    
    # Log the compiled module for deployment
    model_info = tracker.log_compiled_module(result, f"tarot_module_{prompt_version_id[:8]}")

    # Create evaluation results with real metrics
    from ..models import EvaluationRun, MetricResult
    
    evaluation_id = str(uuid.uuid4())
    
    # Create metrics based on actual evaluation results
    metrics = [
        MetricResult(name="dspy_overall", value=eval_scores.get("overall", eval_scores.get("dspy_eval_overall", 0.0))),
        MetricResult(name="training_examples", value=len(trainset)),
        MetricResult(name="eval_examples", value=len(evalset)),
    ]
    
    # Add additional metrics if available
    for metric_name, score in eval_scores.items():
        if metric_name != "overall":
            metrics.append(MetricResult(name=f"dspy_{metric_name}", value=score))
    
    # Store the results
    evaluation = EvaluationRun(
        id=evaluation_id,
        prompt_version_id=str(actual_prompt_version_id),
        dataset=f"training_set_{len(list(training_examples))}",
        metrics=metrics,
        guardrail_violations=[],
        created_at=datetime.now()
    )
    
    store.record_evaluation(evaluation)

    return PromptCandidate(
        prompt_path=str(prompt_path), 
        optimizer="MIPROv2", 
        loss=eval_scores.get("overall", eval_scores.get("dspy_eval_overall", 0.0))
    )


def _metric_fn(gold, pred) -> float:
    """Enhanced metric function for DSPy evaluation."""
    # Handle case where pred might be None or have missing fields
    if pred is None:
        return 0.0
    
    # Convert dspy.Example objects to dicts if needed
    if hasattr(gold, 'toDict'):
        gold = gold.toDict()
    elif hasattr(gold, '__dict__'):
        gold = gold.__dict__
        
    if hasattr(pred, 'toDict'):
        pred = pred.toDict()
    elif hasattr(pred, '__dict__'):
        pred = pred.__dict__
    
    # Handle case where inputs are expected but we have a dict
    if isinstance(gold, dict) and 'inputs' not in gold and 'input' in gold:
        gold_inputs = gold['input'] if 'input' in gold else gold
        pred_inputs = pred
        
        if isinstance(pred_inputs, dict) and 'inputs' not in pred_inputs and 'input' in pred_inputs:
            pred_inputs = pred_inputs['input'] if 'input' in pred_inputs else pred_inputs
            
        # Extract fields for comparison
        gold_overview = gold_inputs.get("overview") if isinstance(gold_inputs, dict) else None
        pred_overview = pred_inputs.get("overview") if isinstance(pred_inputs, dict) else None
        
        gold_synthesis = gold_inputs.get("synthesis") if isinstance(gold_inputs, dict) else None
        pred_synthesis = pred_inputs.get("synthesis") if isinstance(pred_inputs, dict) else None
        
        gold_actionable = gold_inputs.get("actionable_reflection") if isinstance(gold_inputs, dict) else None
        pred_actionable = pred_inputs.get("actionable_reflection") if isinstance(pred_inputs, dict) else None
    else:
        # Direct extraction
        gold_overview = gold.get("overview") if isinstance(gold, dict) else getattr(gold, "overview", None)
        pred_overview = pred.get("overview") if isinstance(pred, dict) else getattr(pred, "overview", None)
        
        gold_synthesis = gold.get("synthesis") if isinstance(gold, dict) else getattr(gold, "synthesis", None)
        pred_synthesis = pred.get("synthesis") if isinstance(pred, dict) else getattr(pred, "synthesis", None)
        
        gold_actionable = gold.get("actionable_reflection") if isinstance(gold, dict) else getattr(gold, "actionable_reflection", None)
        pred_actionable = pred.get("actionable_reflection") if isinstance(pred, dict) else getattr(pred, "actionable_reflection", None)
    
    # Calculate multiple aspect scores
    scores = []
    
    if gold_overview and pred_overview:
        scores.append(_overlap_score(str(gold_overview), str(pred_overview)))
    
    if gold_synthesis and pred_synthesis:
        scores.append(_overlap_score(str(gold_synthesis), str(pred_synthesis)))
    
    if gold_actionable and pred_actionable:
        scores.append(_overlap_score(str(gold_actionable), str(pred_actionable)))
    
    # Return the average of all calculated scores
    return sum(scores) / len(scores) if scores else 0.0


def _overlap_score(gold: str, pred: str) -> float:
    gold_tokens = set(gold.lower().split())
    pred_tokens = set(pred.lower().split())
    if not gold_tokens:
        return 0.0
    return len(gold_tokens & pred_tokens) / len(gold_tokens)
