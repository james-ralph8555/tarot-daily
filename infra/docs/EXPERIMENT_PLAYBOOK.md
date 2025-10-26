# Experiment Playbook

This playbook outlines the nightly and ad-hoc workflow for prompt experimentation with DSPy and PostgreSQL.

## 1. Data Readiness
1. Ensure production feedback has synced into PostgreSQL (`feedback`, `readings` tables).
2. Run `tarot-pipeline dataset build <name>` to generate the latest training dataset. Use descriptive names such as
   `nightly_YYYYMMDD`.
3. Confirm dataset ingestion via `SELECT COUNT(*) FROM training_datasets WHERE dataset = '<name>'` in PostgreSQL.

## 2. Optimization
1. Execute `tarot-pipeline optimize mipro <name>` to launch MIPROv2 against the dataset.
2. Optimizer output is written to `var/prompts/<name>/prompt.txt` and recorded in `prompt_versions` as `candidate`.
3. Capture loss metrics and qualitative notes in the experiment log (see `infra/docs/ROLLBACK_GUIDE.md`).

## 3. Evaluation
1. Run `tarot-pipeline eval dataset <name>` to compute offline heuristics.
2. If heuristics meet thresholds (coverage ≥0.8, disclaimer ≥1.0), trigger an online canary by updating
   `prompt_versions.status` to `candidate` and scheduling a platform deployment.
3. Store evaluation metrics via `tarot-pipeline nightly` or manual insertion to `evaluation_runs`.

## 4. Promotion Criteria
* Guardrails: no critical assertions violated (e.g., missing disclaimers, unsafe language).
* Metrics: composite score above last promoted baseline (default 0.75).
* Feedback: user polarity stays neutral or improves over 24h window.

## 5. Canary & Promotion
1. Promote candidate to a 10% traffic slice by updating feature flag config (see `infra/scripts/feature-flags.json`).
2. Observe metrics & qualitative feedback for 24h.
3. If successful, set `prompt_versions.status = 'promoted'`, record evaluation in PostgreSQL, and tag the prompt commit.
4. If regression observed, follow rollback procedure.
