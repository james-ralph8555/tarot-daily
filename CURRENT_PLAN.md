# Daily Tarot Implementation Plan

## 9) Feedback loop (HF)

UI captures: thumb, optional rationale, optional tags (e.g., "too generic", "on point").

Why tags: binary lacks nuance; brief structured feedback improves learnability. 

Server transforms a subset into DSPy Examples: {inputs: (intent, spread, cards, seed, model, prompt_version), label: (target qualities / critique)} with metric-compatible labels.

## 10) Evaluation & promotion policy

Metric bundle (0–1 scale):

- Coverage (all cards referenced).
- Coherence (no contradictions across positions).
- Actionability (contains concrete reflection prompts).
- Tone adherence (supportive, non-prescriptive).
- Length window (within target token budget).

Thresholds: promote new prompt version only if +Δ ≥ pre-agreed on held-out test set and no regression on coverage and tone.

## 11) Daily determinism & caching

Idempotency keys: user_id + date_utc to prevent duplicate reads.

Seed derivation: server-side HMAC; store seed with reading.

Caching: If a reading exists for user/date & prompt_version, reuse unless the user requests regeneration (admin-only during experiments).

## 13) Telemetry & cost

Log Groq usage and latency per request; compute per-reading cost and rolling monthly cost. Groq response objects include a usage section and model id for auditing.

Track thumb rate, opt-in rate, 7-day return rate, avg. time to first token, completion rate. Ensure these metrics are implemented (data collection in web app) and in pipeline (metrics computation and display on website "DSPy Prompt Tuning Results" page).
