# Daily Tarot Pipeline

DSPy-driven offline prompt optimization, evaluation, and analytics for the Tarot Daily product. The CLI exposes
cohesive workflows for ingesting feedback, building datasets, running optimizers such as MIPROv2, and evaluating new
prompt variants before promotion.

```
# Bootstrap environment
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Run nightly job
tarot-pipeline nightly
```
