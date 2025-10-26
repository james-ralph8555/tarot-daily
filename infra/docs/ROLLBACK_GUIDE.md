# Rollback Guide

Follow this procedure when a prompt deployment or backend change needs to be reversed.

## Trigger Conditions
* Guardrail violation alerts (missing disclaimer, determinism failure, safety issue).
* Feedback polarity drops >20% within 2 hours of deployment.
* Latency SLA breach at Groq p95 > 3s for sustained 10 minutes.

## Immediate Actions
1. Set feature flag `prompt.activeVersion` to the last known good prompt.
2. Update `prompt_versions.status` to `rolled_back` for the offending version.
3. Redeploy the web app using `apps/web/Dockerfile` image pinned to previous tag.
4. Notify support and log incident in runbook.

## Data Steps
1. Insert an entry into `alerts` table with context for analytics.
2. Export affected readings via `SELECT * FROM readings WHERE prompt_version = '<id>'` for audit.
3. Record guardrail violations in `evaluation_runs` with status `rolled_back`.

## Post-Mortem Checklist
* Identify failure root cause (prompt regression, infra issue, or LLM change).
* Patch DSPy optimizer config or training dataset (e.g., filter noisy feedback).
* Add new assertion checks or metrics if gap identified.
* Schedule follow-up experiment with mitigation steps documented in `EXPERIMENT_PLAYBOOK.md`.
