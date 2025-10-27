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
# Start postgres first
docker-compose up -d postgres

# Run nightly job
docker run --rm --network daily-tarot_default -e GROQ_API_KEY=your_key -e POSTGRES_HOST=postgres daily-tarot-pipeline nightly
```

### Development with Docker
```bash
# Start postgres and build/run pipeline in one command
docker-compose up -d postgres && docker build -f apps/pipeline/Dockerfile -t daily-tarot-pipeline . && docker run --rm --network daily-tarot_default -e GROQ_API_KEY=your_key -e POSTGRES_HOST=postgres daily-tarot-pipeline nightly
```
