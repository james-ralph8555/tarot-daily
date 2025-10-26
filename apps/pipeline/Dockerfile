# syntax=docker/dockerfile:1
FROM python:3.13-slim AS runner
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY apps/pipeline/pyproject.toml .
COPY apps/pipeline/README.md .
COPY apps/pipeline/src ./src

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

ENTRYPOINT ["tarot-pipeline"]
CMD ["nightly"]
