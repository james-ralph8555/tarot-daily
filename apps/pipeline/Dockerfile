# syntax=docker/dockerfile:1
FROM python:3.13-slim AS deps
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY apps/pipeline/pyproject.toml .
COPY apps/pipeline/README.md .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir .

FROM python:3.13-slim AS runner
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY --from=deps /usr/local/lib/python3.13/site-packages /usr/local/lib/python3.13/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY apps/pipeline/src ./src

ENTRYPOINT ["tarot-pipeline"]
CMD ["nightly"]
