from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Optional

import typer

from .config import get_settings
from .datasets import build_training_examples, persist_dataset
from .postgres_store import PostgresStore
from .evaluate.metrics import evaluate_dataset, detailed_evaluation
from .models import EvaluationRun, MetricResult, TrainingExample
from .optimizers.mipro import run_mipro, _metric_fn
from .mlflow_tracker import get_mlflow_tracker

app = typer.Typer(help="Tarot Daily offline pipeline", pretty_exceptions_enable=False)

model_app = typer.Typer(help="Model management and serving")
app.add_typer(model_app, name="model")

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
    dataset: Optional[str] = typer.Argument(None, help="Dataset name to use (if not provided, builds from feedback)"),
    limit: int = typer.Option(2000, help="Max feedback examples to use when building dataset"),
    out: Optional[Path] = typer.Option(None, help="Output directory for optimized prompt"),
):
    """Run MIPROv2 optimizer using stored dataset with MLflow tracking."""

    store = PostgresStore(get_settings())
    
    # If no dataset provided, build from feedback
    if dataset is None:
        examples = build_training_examples(store, limit=limit, include_negative=True)
        dataset = f"feedback-built-{len(examples)}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        persist_dataset(store, dataset, examples)
        typer.echo(f"Built dataset '{dataset}' with {len(examples)} examples from feedback")
    else:
        examples = _load_dataset_examples(store, dataset)
        if not examples:
            raise typer.BadParameter(f"Dataset '{dataset}' not found")

    # Initialize MLflow tracking
    tracker = get_mlflow_tracker("mipro-optimization")
    
    with tracker.start_run(
        run_name=f"mipro-{dataset}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
        tags={"dataset": dataset, "optimizer": "MIPROv2"}
    ):
        # Log dataset and optimizer configuration
        optimizer_config = {
            "init_temperature": 0.7,
            "max_tokens": 800,
            "model": get_settings().groq_dev_model,
        }
        
        tracker.log_dspy_optimizer(
            optimizer_name="MIPROv2",
            optimizer_config=optimizer_config,
            dataset_name=dataset,
            dataset_size=len(examples),
            examples=examples,
        )

        output_dir = out or (get_settings().prompt_workspace / dataset)
        candidate = run_mipro(examples, output_dir)
        
        # Log optimization results
        tracker.log_dspy_candidate(candidate, "MIPROv2")
        
        typer.echo(f"Optimizer complete. Prompt stored at {candidate.prompt_path} (loss={candidate.loss})")
        typer.echo(f"Results tracked in MLflow experiment 'mipro-optimization'")


@eval_app.command("dataset")
def evaluate_dataset_cmd(dataset: str, model_uri: Optional[str] = typer.Option(None, help="MLflow model URI to evaluate (optional)")):
    """Evaluate aggregate metrics on a dataset with MLflow tracking."""

    store = PostgresStore(get_settings())
    examples = _load_dataset_examples(store, dataset)
    if not examples:
        raise typer.BadParameter(f"Dataset '{dataset}' not found")
    
    # Initialize MLflow tracking
    tracker = get_mlflow_tracker("evaluation")
    
    with tracker.start_run(
        run_name=f"eval-{dataset}-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}",
        tags={"dataset": dataset, "evaluation_type": "dataset"}
    ):
        if model_uri:
            # Evaluate a specific model from MLflow
            try:
                import mlflow.dspy
                loaded_model = mlflow.dspy.load_model(model_uri)
                
                # Convert examples to DSPy format for evaluation
                dspy_examples = [
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
                    for example in examples
                ]
                
                # Run evaluation with the loaded model
                eval_scores = tracker.log_dspy_evaluation(
                    dspy_examples, 
                    loaded_model, 
                    lambda gold, pred: _metric_fn(gold, pred)
                )
                
                typer.echo(f"Evaluating model from MLflow: {model_uri}")
                typer.echo(f"Evaluation scores: {eval_scores}")
                
            except Exception as e:
                typer.echo(f"Error loading model from MLflow: {e}", err=True)
                raise
        else:
            # Get detailed metrics without MLflow model loading
            metrics = detailed_evaluation(examples)
            composite_score = metrics["composite"]
            
            # Log metrics to MLflow
            tracker.log_evaluation_metrics(metrics, dataset)
            
            typer.echo(f"Composite metric for dataset '{dataset}': {composite_score:.3f}")
            typer.echo(f"Detailed metrics: {metrics}")
        
        typer.echo(f"Results tracked in MLflow experiment 'evaluation'")


@app.command("serve")
def serve_mlflow(port: int = typer.Option(5000, help="Port for MLflow UI server"),
                host: str = typer.Option("0.0.0.0", help="Host for MLflow UI server")):
    """Start the MLflow UI server for tracking experiments."""
    import subprocess
    import os
    
    # Ensure data directory exists
    data_dir = Path("./data")
    data_dir.mkdir(parents=True, exist_ok=True)
    
    # Set environment variables
    env = os.environ.copy()
    env["MLFLOW_BACKEND_STORE_URI"] = f"sqlite:///{data_dir}/mlflow.db"
    env["MLFLOW_DEFAULT_ARTIFACT_ROOT"] = str(data_dir / "mlartifacts")
    
    cmd = [
        "mlflow", "server",
        "--host", host,
        "--port", str(port),
        "--backend-store-uri", f"sqlite:///{data_dir}/mlflow.db",
        "--default-artifact-root", str(data_dir / "mlartifacts"),
        "--serve-artifacts"
    ]
    
    typer.echo(f"Starting MLflow server on http://{host}:{port}")
    typer.echo(f"Backend store: sqlite:///{data_dir}/mlflow.db")
    typer.echo(f"Artifacts root: {data_dir / 'mlartifacts'}")
    typer.echo("Press Ctrl+C to stop the server")
    
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        typer.echo("\nMLflow server stopped")
    except Exception as e:
        typer.echo(f"Error starting MLflow server: {e}", err=True)
        raise


@app.command("nightly")
def nightly(limit: int = typer.Option(2000, help="Max rows for dataset build")):
    """Full nightly workflow: dataset build -> optimize -> evaluate -> record with MLflow tracking."""

    timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
    dataset_name = f"nightly_{timestamp}"
    store = PostgresStore(get_settings())
    examples = build_training_examples(store, limit=limit)
    persist_dataset(store, dataset_name, examples)
    
    # Initialize MLflow tracking for the full workflow
    tracker = get_mlflow_tracker("nightly-workflow")
    
    with tracker.start_run(
        run_name=f"nightly-{timestamp}",
        tags={"workflow": "nightly", "dataset_size": str(len(examples))}
    ):
        # Log dataset creation
        tracker.log_dspy_optimizer(
            optimizer_name="dataset_build",
            optimizer_config={"limit": limit},
            dataset_name=dataset_name,
            dataset_size=len(examples),
            examples=examples,
        )
        
        prompt_dir = get_settings().prompt_workspace / dataset_name
        candidate = run_mipro(examples, prompt_dir)
        
        # Log optimization results
        tracker.log_dspy_candidate(candidate, "MIPROv2")
        
        # Evaluate results
        metrics = detailed_evaluation(examples)
        composite_score = metrics["composite"]
        tracker.log_evaluation_metrics(metrics, dataset_name)

        prompt_id = Path(candidate.prompt_path).stem
        store.insert_prompt_version(prompt_id, candidate.optimizer)

        evaluation = EvaluationRun(
            id=f"eval_{timestamp}",
            prompt_version_id=prompt_id,
            dataset=dataset_name,
            metrics=[
                MetricResult(name="composite", value=composite_score),
                *[MetricResult(name=name, value=value) for name, value in metrics.items() if name != "composite"]
            ],
            guardrail_violations=[],
            created_at=datetime.utcnow(),
        )
        
        # Log final evaluation run
        tracker.log_evaluation_run(evaluation.id, prompt_id, evaluation.metrics)
        store.record_evaluation(evaluation)
        
        typer.echo("Nightly workflow complete.")
        typer.echo(f"Composite score: {composite_score:.3f}")
        typer.echo(f"All results tracked in MLflow experiment 'nightly-workflow'")


@model_app.command("list")
def list_models(experiment: Optional[str] = typer.Option(None, help="Experiment name filter")):
    """List available DSPy models in MLflow."""
    import mlflow
    
    # Configure MLflow tracking
    tracker = get_mlflow_tracker()
    
    if experiment:
        mlflow.set_experiment(experiment)
    
    # Search for DSPy models
    filter_string = "tag.dspy_model = 'true'" if experiment else None
    runs = mlflow.search_runs(experiment_names=[experiment] if experiment else None, 
                              filter_string=filter_string)
    
    if runs.empty:
        typer.echo("No DSPy models found.")
        return
    
    typer.echo("Available DSPy models in MLflow:")
    for _, run in runs.iterrows():
        model_uri = f"runs:/{run['run_id']}/model"
        typer.echo(f"  {run['run_id'][:8]}... - {run['tags']['mlflow.runName']} - {model_uri}")


@model_app.command("serve")
def serve_model(model_uri: str = typer.Argument(..., help="MLflow model URI to serve"), 
                port: int = typer.Option(8080, help="Port to serve on")):
    """Serve a DSPy model from MLflow using MLflow model serving."""
    import mlflow.pyfunc
    import subprocess
    import sys
    
    try:
        # Load the model to verify it exists
        model = mlflow.pyfunc.load_model(model_uri)
        typer.echo(f"Loading model from: {model_uri}")
        
        # Start MLflow model serving
        cmd = [
            sys.executable, "-m", "mlflow.pyfunc.serving",
            "--model-uri", model_uri,
            "--port", str(port),
            "--host", "0.0.0.0"
        ]
        
        typer.echo(f"Starting model server on port {port}...")
        typer.echo(f"Model will be available at: http://localhost:{port}/invocations")
        
        subprocess.run(cmd, check=True)
        
    except Exception as e:
        typer.echo(f"Error serving model: {e}", err=True)
        raise


@model_app.command("predict")
def predict_model(model_uri: str = typer.Argument(..., help="MLflow model URI"),
                  intent: str = typer.Option("What guidance do I need today?", help="User intent"),
                  spread_type: str = typer.Option("single", help="Spread type"),
                  card_id: str = typer.Option("00-fool", help="Card ID for single spread"),
                  orientation: str = typer.Option("upright", help="Card orientation"),
                  tone: str = typer.Option("wise", help="Reading tone")):
    """Test prediction with a DSPy model from MLflow."""
    import mlflow.dspy
    
    try:
        # Load the DSPy model
        model = mlflow.dspy.load_model(model_uri)
        
        # Prepare input
        cards = [{
            "cardId": card_id,
            "orientation": orientation,
            "position": "present"
        }]
        
        typer.echo(f"Running prediction with model: {model_uri}")
        typer.echo(f"Input: intent='{intent}', spread_type='{spread_type}', card='{card_id}' ({orientation})")
        
        # Make prediction
        result = model(intent=intent, spread_type=spread_type, cards=cards, tone=tone)
        
        typer.echo("\nPrediction Result:")
        typer.echo(f"Overview: {result.overview}")
        typer.echo(f"Synthesis: {result.synthesis}")
        typer.echo(f"Actionable Reflection: {result.actionable_reflection}")
        
    except Exception as e:
        typer.echo(f"Error running prediction: {e}", err=True)
        raise


def _load_dataset_examples(store: PostgresStore, dataset: str) -> list[TrainingExample]:
    dataset_data = store.get_training_dataset(dataset)
    if not dataset_data:
        return []
    return [TrainingExample.model_validate_json(data) if isinstance(data, str) else TrainingExample.model_validate(data) for data in dataset_data]
