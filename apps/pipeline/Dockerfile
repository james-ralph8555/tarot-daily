# syntax=docker/dockerfile:1
FROM python:3.13-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install uv
RUN pip install --no-cache-dir uv

# Install dependencies first (least likely to change)
COPY apps/pipeline/pyproject.toml .
COPY apps/pipeline/README.md .
RUN uv pip install --no-cache-dir --system .

# Copy source last (most likely to change)
COPY apps/pipeline/src ./src

ENTRYPOINT ["uv", "run", "tarot-pipeline"]
CMD ["nightly"]
