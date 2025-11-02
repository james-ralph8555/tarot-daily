# syntax=docker/dockerfile:1
FROM python:3.13-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y git

# Install uv
RUN pip install --no-cache-dir uv

# Install dependencies first (least likely to change)
COPY pyproject.toml .
COPY README.md .
RUN uv pip install --no-cache-dir --system .

# Copy source last (most likely to change)
COPY src ./src

ENTRYPOINT ["uv", "run", "tarot-pipeline"]
CMD ["nightly"]
