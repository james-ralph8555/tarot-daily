from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

import dspy
import mlflow
import mlflow.dspy
from pydantic import BaseModel

from .config import get_settings


class MLflowTracker:
    """MLflow tracking integration for DSPy experiments."""
    
    def __init__(self, experiment_name: Optional[str] = None):
        self.settings = get_settings()
        self.experiment_name = experiment_name or "daily-tarot-dspy"
        self._setup_tracking()
    
    def _setup_tracking(self) -> None:
        """Configure MLflow tracking server and experiment."""
        # Ensure data directory exists
        data_dir = Path("./data")
        data_dir.mkdir(parents=True, exist_ok=True)
        
        # Set MLflow tracking URI to local SQLite backend
        mlflow.set_tracking_uri(f"sqlite:///{data_dir}/mlflow.db")
        
        # Create or get experiment
        experiment = mlflow.get_experiment_by_name(self.experiment_name)
        if experiment is None:
            mlflow.create_experiment(self.experiment_name)
        
        mlflow.set_experiment(self.experiment_name)
        
        # Enable comprehensive DSPy autologging
        mlflow.dspy.autolog(
            log_compiles=True,
            log_evals=True,
            log_traces_from_compile=True,
            log_traces_from_eval=True
        )
    
    def start_run(self, run_name: Optional[str] = None, tags: Optional[dict[str, str]] = None) -> mlflow.ActiveRun:
        """Start a new MLflow run."""
        return mlflow.start_run(run_name=run_name, tags=tags)
    
    def log_dspy_optimizer(
        self,
        optimizer_name: str,
        optimizer_config: dict[str, Any],
        dataset_name: str,
        dataset_size: int,
        examples: list[Any],
    ) -> None:
        """Log DSPy optimizer configuration and dataset info."""
        # Log optimizer parameters
        mlflow.log_params({
            "optimizer_name": optimizer_name,
            "optimizer_config": json.dumps(optimizer_config),
            "dataset_name": dataset_name,
            "dataset_size": dataset_size,
        })
        
        # Log dataset as artifact
        data_dir = Path("./data")
        dataset_dir = data_dir / "datasets"
        dataset_dir.mkdir(parents=True, exist_ok=True)
        dataset_path = dataset_dir / f"{dataset_name}.json"
        
        with open(dataset_path, "w") as f:
            json.dump([ex.model_dump() if hasattr(ex, 'model_dump') else ex for ex in examples], f, indent=2)
        
        mlflow.log_artifact(dataset_path, "datasets")
    
    def log_dspy_candidate(self, candidate: Any, optimizer_name: str) -> None:
        """Log DSPy optimization candidate results."""
        if hasattr(candidate, 'loss'):
            mlflow.log_metric("optimizer_loss", candidate.loss)
        
        if hasattr(candidate, 'prompt_path') and candidate.prompt_path:
            mlflow.log_artifact(candidate.prompt_path, "prompts")
        
        # Log candidate metadata
        if hasattr(candidate, 'metadata'):
            mlflow.log_dict(candidate.metadata, "candidate_metadata.json")
    
    def log_compiled_module(self, module: dspy.Module, model_name: str = "model") -> None:
        """Log a compiled DSPy module to MLflow."""
        model_info = mlflow.dspy.log_model(
            module,
            artifact_path=model_name,
            input_example={
                "intent": "What guidance do I need today?",
                "spread_type": "single",
                "cards": [{"card_id": "00-fool", "orientation": "upright", "position": "present"}],
                "tone": "wise"
            }
        )
        return model_info
    
    def log_evaluation_metrics(self, metrics: dict[str, float], dataset_name: str) -> None:
        """Log evaluation metrics."""
        for name, value in metrics.items():
            mlflow.log_metric(f"eval_{name}", value)
        
        mlflow.log_param("eval_dataset", dataset_name)
    
    def log_evaluation_run(self, evaluation_id: str, prompt_version_id: str, metrics: list[Any]) -> None:
        """Log a complete evaluation run."""
        mlflow.log_params({
            "evaluation_id": evaluation_id,
            "prompt_version_id": prompt_version_id,
        })
        
        for metric in metrics:
            if hasattr(metric, 'name') and hasattr(metric, 'value'):
                mlflow.log_metric(f"metric_{metric.name}", metric.value)
    
    def log_dspy_evaluation(self, dataset: list[Any], module: dspy.Module, metric_fn: callable) -> dict[str, float]:
        """Run and log DSPy evaluation with automatic tracing."""
        evaluator = dspy.Evaluate(
            devset=dataset,
            metric=metric_fn,
            num_threads=1,
            display_progress=True,
            display_table=True
        )
        
        # Run evaluation - this will be automatically logged due to autologging
        scores = evaluator(module)
        
        # Extract and log the final score
        if isinstance(scores, dict):
            for metric_name, score in scores.items():
                mlflow.log_metric(f"dspy_eval_{metric_name}", score)
        else:
            mlflow.log_metric("dspy_eval_overall", scores)
            
        return scores if isinstance(scores, dict) else {"overall": scores}
    
    def end_run(self) -> None:
        """End the current MLflow run."""
        mlflow.end_run()


def get_mlflow_tracker(experiment_name: Optional[str] = None) -> MLflowTracker:
    """Get configured MLflow tracker instance."""
    return MLflowTracker(experiment_name)