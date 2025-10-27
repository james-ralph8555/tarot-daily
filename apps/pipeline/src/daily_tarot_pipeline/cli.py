from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

import typer

from .config import get_settings
from .datasets import build_training_examples, persist_dataset
from .postgres_store import PostgresStore
from .evaluate.metrics import evaluate_dataset
from .models import EvaluationRun, MetricResult, TrainingExample
from .optimizers.mipro import run_mipro

app = typer.Typer(help="Tarot Daily offline pipeline", pretty_exceptions_enable=False)

dataset_app = typer.Typer(help="Dataset operations")
optimizer_app = typer.Typer(help="Prompt optimization")
eval_app = typer.Typer(help="Evaluation workflow")
app.add_typer(dataset_app, name="dataset")
app.add_typer(optimizer_app, name="optimize")
app.add_typer(eval_app, name="eval")


@dataset_app.command("build")
def build_dataset(name: str = typer.Argument(..., help="Dataset label"), limit: int = typer.Option(2000, help="Max rows")):
    """Build a dataset by merging readings and feedback."""

    store = PostgresStore(get_settings())
    examples = build_training_examples(store, limit=limit)
    persist_dataset(store, name, examples)
    typer.echo(f"Persisted {len(examples)} examples to dataset '{name}'.")


@optimizer_app.command("mipro")
def optimize_mipro(
    dataset: str = typer.Argument(..., help="Dataset name to use"),
    out: Optional[Path] = typer.Option(None, help="Output directory for optimized prompt"),
):
    """Run MIPROv2 optimizer using stored dataset."""

    store = PostgresStore(get_settings())
    examples = _load_dataset_examples(store, dataset)
    if not examples:
        raise typer.BadParameter(f"Dataset '{dataset}' not found")

    output_dir = out or (get_settings().prompt_workspace / dataset)
    candidate = run_mipro(examples, output_dir)
    typer.echo(f"Optimizer complete. Prompt stored at {candidate.prompt_path} (loss={candidate.loss})")


@eval_app.command("dataset")
def evaluate_dataset_cmd(dataset: str):
    """Evaluate aggregate metrics on a dataset."""

    store = PostgresStore(get_settings())
    examples = _load_dataset_examples(store, dataset)
    if not examples:
        raise typer.BadParameter(f"Dataset '{dataset}' not found")
    score = evaluate_dataset(examples)
    typer.echo(f"Composite metric for dataset '{dataset}': {score:.3f}")


@app.command("nightly")
def nightly(limit: int = typer.Option(2000, help="Max rows for dataset build")):
    """Full nightly workflow: dataset build -> optimize -> evaluate -> record."""

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    dataset_name = f"nightly_{timestamp}"
    store = PostgresStore(get_settings())
    examples = build_training_examples(store, limit=limit)
    persist_dataset(store, dataset_name, examples)
    prompt_dir = get_settings().prompt_workspace / dataset_name
    candidate = run_mipro(examples, prompt_dir)
    score = evaluate_dataset(examples)

    prompt_id = Path(candidate.prompt_path).stem
    store.insert_prompt_version(prompt_id, candidate.optimizer)

    evaluation = EvaluationRun(
        id=f"eval_{timestamp}",
        prompt_version_id=prompt_id,
        dataset=dataset_name,
        metrics=[MetricResult(name="composite", value=score)],
        guardrail_violations=[],
        created_at=datetime.utcnow(),
    )
    store.record_evaluation(evaluation)
    typer.echo("Nightly workflow complete.")


def _load_dataset_examples(store: PostgresStore, dataset: str) -> list[TrainingExample]:
    dataset_data = store.get_training_dataset(dataset)
    if not dataset_data:
        return []
    return [TrainingExample.model_validate_json(data) if isinstance(data, str) else TrainingExample.model_validate(data) for data in dataset_data]
