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

## Docker Guide

### Build the Docker image
```bash
docker build -f apps/pipeline/Dockerfile -t daily-tarot-pipeline .
```

### Run the pipeline in Docker
```bash
# Run nightly job
docker run --rm daily-tarot-pipeline nightly

# Run with environment variables
docker run --rm -e GROQ_API_KEY=your_key daily-tarot-pipeline nightly
```

### Development with Docker
```bash
# Build and run in one command
docker build -f apps/pipeline/Dockerfile -t daily-tarot-pipeline . && docker run --rm daily-tarot-pipeline nightly
```
