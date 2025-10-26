# Tarot Daily — Raw Technical Manuscript (for a coding agent)

Intro: this is a guide you should implement, using a monorepo structure for the components in this directory.  Nothing has been done yet besides git repo init

## 0) Purpose & non-negotiables

* **Product**: a **daily-use** Tarot reading site that improves over time through **DSPy-based prompt optimization** and **backtesting**, using **human feedback** (thumbs up/down + optional rationale).
* **Frontend**: **SolidJS + TypeScript**, SSR with API routes.
* **Inference**: **Groq’s OpenAI-compatible Chat API** with `openai/gpt-oss-20b` for development/backtests and `openai/gpt-oss-120b` for production reads. Endpoint: `POST https://api.groq.com/openai/v1/chat/completions`. Models and pricing exist in Groq’s official model list; the Chat endpoint is documented in Groq’s API reference. ([GroqCloud][1])
* **Offline prompt engineering & eval**: **Python + DSPy**, with **DuckDB** as the local analytics store. DSPy supports provider/model strings via its `LM` adapter (OpenAI-style) and ships optimizers like **MIPROv2** with the evaluation stack (`Evaluate`, metrics, datasets). ([dspy.ai][2])
* **Persistence/analytics**: **DuckDB** (in-process OLAP DB), leveraging its **optimistic concurrency** and ACID guarantees; design for **append-heavy** writes and batched updates. ([DuckDB][3])
* **Engagement**: PWA with **service worker** caching and **Web Push** opt-in for daily nudges. ([MDN Web Docs][4])

---

## 1) High-level architecture

**Three subsystems:**

1. **Web App (SolidStart)**

   * SSR UI, API routes for read generation, feedback intake, auth, and telemetry. SolidStart’s **API routes** handle REST/webhook endpoints co-located with UI. ([docs.solidjs.com][5])
   * Auth via **Lucia** (session cookies). Note: SolidStart **does not include CSRF protection by default**; implement CSRF on state-changing routes. ([Lucia v3][6])
   * PWA: service worker for offline caching, Push API for daily reminders. ([MDN Web Docs][4])

2. **Inference Layer (Groq)**

   * Uses **OpenAI-compatible** chat completions endpoint. Support **streaming** to the UI, enforce model IDs: `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, with versioning gates. Groq’s model catalog shows both GPT-OSS models, their context windows and rates. ([GroqCloud][1])

3. **Offline Optimization & Analytics (Python + DSPy + DuckDB)**

   * **Pipeline**: ingest feedback/logs → curate evaluation datasets → **DSPy** optimizer runs (e.g., **MIPROv2**, **BootstrapFewShot**) → **Evaluate** across dev/test splits → write **prompt versions** and metrics to DuckDB → roll out new prompt under staged flags. ([dspy.ai][7])
   * **DuckDB** used for OLAP aggregations; designed for **batch writes** and **append-only** patterns to reduce write conflicts. ([DuckDB][3])

---

## 2) User journeys

* **Daily reading**: user lands → sees “Today’s Draw” → optional intent input → streaming reading + card visuals → feedback widget (thumbs + rationale). PWA prompt to add to home screen; push opt-in for **daily reminder**.
* **History**: view past readings (deterministic daily seed; reproducible).
* **Settings**: notification prefs, privacy, export data.

---

## 3) Prompt & reading design (determinism + ethics)

* **Deterministic daily draw**: derive a per-user **seed** as `HMAC-SHA256(user_id || UTC-YYYY-MM-DD)`, use it to:
  a) shuffle 78-card deck (allow reversed)
  b) pick spread positions (e.g., 3-card, Celtic Cross)
  c) log seed + cards + orientations for reproducibility.
* **Safety & scope**: output must carry a clear **disclaimer** (entertainment; no medical/financial/legal advice).
* **Structure** (for DSPy to compile): signature expecting inputs `{intent?, spread_type, cards[w/ meanings], user_tone_prefs?}` and output with fields `{overview, card_breakdowns[], synthesis, actionable_reflection, tone}`.
* **DSPy Assertions**: enforce output properties (e.g., include all cards, avoid claims of certainty). DSPy **Assertions** are a built-in construct for rule-like constraints. ([arXiv][8])

---

## 4) Frontend (SolidJS + TypeScript)

**Stack**: SolidStart (file-based **routing + API routes**), Tailwind (optional), PWA. ([docs.solidjs.com][9])

**Key routes/pages**

* `/` Home (Today’s Draw): SSR page; fetches `GET /api/reading?date=YYYY-MM-DD` (idempotent per user/day).
* `/history` Past readings (paginated; server transforms seeds → decks deterministically).
* `/settings` Notification & privacy controls.
* `/legal` Disclaimers & terms.

**API routes (server)**

* `POST /api/reading` Create/return reading for the user/date (idempotent by seed).
* `POST /api/feedback` Upsert feedback `{reading_id, thumb: +1|-1, rationale?}`.
* `GET /api/history` Paginated readings list.
* `POST /api/push/subscribe` Store push subscription (VAPID).
* `POST /api/auth/*` Lucia routes as needed (session cookies).

**UX requirements**

* **Streaming** rendering of LLM deltas for quick perceived performance.
* **Feedback widget**: thumbs left/right, rationale optional. Nielsen Norman Group recommends **multiple feedback formats** for nuance; we’ll capture binary + optional text. ([Nielsen Norman Group][10])
* Consider augmenting binary with one-tap tags (e.g., “too vague”, “insightful”). Microsoft HCI guidance warns that **binary alone is low-signal**; add lightweight categoricals. ([Medium][11])

**PWA**

* **Service worker** for offline-first caching of shell and last N readings; **Push API** + VAPID for daily reminders. Use MDN patterns; avoid aggressive prompt spam. ([MDN Web Docs][12])

---

## 5) Auth, sessions, security

* **Auth**: **Lucia** for session cookies; implement **CSRF protection** on mutating API routes (SolidStart lacks CSRF out of the box, Lucia docs flag this). ([Lucia v3][6])
* **PII**: minimize; user id, email (optional), push subscription.
* **Secrets**: `GROQ_API_KEY` server-only; never expose in client.
* **Rate limiting**: per-IP + per-user on `POST /api/reading` and `/api/feedback`.
* **Content controls**: DSPy assertions to avoid harmful claims; server filters to redact obvious PII in logs.

---

## 6) Inference layer (Groq)

* **Endpoint**: `POST /openai/v1/chat/completions`. **Model IDs**: `openai/gpt-oss-20b` (dev/backtest), `openai/gpt-oss-120b` (prod). Use **max_completion_tokens**, `temperature`, `top_p`; track **usage** object for cost. ([GroqCloud][13])
* **Capabilities**: The Groq **Models** page lists **GPT-OSS 20B & 120B** with context and token rates; respect rate limits (TPM/RPM) and implement backoff. ([GroqCloud][1])
* **Streaming**: SSE to UI; graceful fallback to non-stream if network blocks streams.
* **Rollout policy**:

  * Default production: 120B.
  * Auto-fallback to 20B on rate-limit/latency spikes; mark in telemetry.
  * A/B prompt versioning via server flag.

---

## 7) DSPy program (offline, Python)

**Why DSPy here**: Declarative, with **optimizers (Teleprompters)** that **compile** better prompts rather than writing brittle strings; supports multiple providers through `LM` adapter including OpenAI-compatible endpoints. ([dspy.ai][2])

**Core elements**

* **LM setup**: configure DSPy `LM` with provider/model string (OpenAI-style). Use Groq’s compatible host as `api_base`. (DSPy docs show `LM` with `"openai/<model>"` and provider flexibility.) ([dspy.ai][2])
* **Signatures & modules**: one module to synthesize reading from `{spread, cards, intent}` to structured fields.
* **Optimizers**: start with **MIPROv2** (joint instruction + few-shot optimization), optionally **BootstrapFewShot** for curated demo selection. ([dspy.ai][7])
* **Metrics**: custom **rubric** function(s): coverage of all drawn cards, internal consistency, reflection/actionability, tone constraints, length bounds. DSPy supports pluggable metrics and `Evaluate`. ([dspy.ai][14])
* **Backtesting**: nightly job: sample last N days of anonymized interactions, stratify by spread/type, rebuild **dev/test** splits, run optimizer, log metric deltas; only promote if threshold improvements hold on held-out set.

**Observability**

* **MLflow autologging for DSPy optimizers** or **Langfuse** tracing for runs; store run IDs and artifacts. ([mlflow.org][15])

---

## 8) Data model (DuckDB)

**Rationale**: in-process **OLAP** DB ideal for analytics/experiments; we’ll do **append-heavy** writes and batch updates to fit DuckDB concurrency model (optimistic CC; ACID). ([DuckDB][3])

**Tables (columnar schema; analytics-friendly)**

* `users`: `user_id (TEXT PK)`, `created_at`, `auth_provider`, `email?`, `locale`, `tz`.
* `cards`: `card_id (SMALLINT)`, `name`, `arcana`, `upright_keywords[]`, `reversed_keywords[]`, `longform_text`.
* `spreads`: `spread_id`, `name`, `positions[]`, `max_cards`.
* `readings`: `reading_id (TEXT PK)`, `user_id`, `date_utc (DATE)`, `seed (TEXT)`, `model_id`, `prompt_version`, `spread_id`, `cards_drawn[]`, `orientations[]`, `raw_messages_json`, `output_struct_json`, `latency_ms`, `usage_input_tokens`, `usage_output_tokens`, `cost_usd_est`, `served_streaming (BOOL)`, `created_at`.
* `feedback`: `feedback_id`, `reading_id`, `user_id`, `thumb (SMALLINT in {-1, +1})`, `rationale (TEXT)`, `tagset (TEXT[])`, `created_at`.
* `experiments`: `exp_id`, `prompt_version`, `optimizer`, `model_id`, `metric_name`, `metric_value`, `split (dev/test)`, `n_samples`, `p_value?`, `created_at`.
* `push_subscriptions`: `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`, `opted_in (BOOL)`.
* `errors`: `error_id`, `when`, `where`, `user_id?`, `reading_id?`, `payload_hash`, `message`.

**Performance notes**

* Keep **append-only** for `readings` and `feedback`. Batch compact older data nightly.
* If you stage parquet imports/exports, mind **row group sizes** (100k–1M) for parallelism. ([DuckDB][16])

**Concurrency**

* Single process writer is preferred; if multiple workers are needed, wrap with retry on OCC aborts; avoid hot-row updates. ([DuckDB][17])

---

## 9) Feedback loop (HF)

* UI captures: **thumb**, optional **rationale**, optional **tags** (e.g., “too generic”, “on point”).
* Why tags: binary lacks nuance; brief structured feedback improves learnability. ([Medium][11])
* Server transforms a subset into **DSPy Examples**: `{inputs: (intent, spread, cards, seed, model, prompt_version), label: (target qualities / critique)}` with metric-compatible labels.

---

## 10) Evaluation & promotion policy

* **Metric bundle** (0–1 scale):

  * **Coverage** (all cards referenced).
  * **Coherence** (no contradictions across positions).
  * **Actionability** (contains concrete reflection prompts).
  * **Tone adherence** (supportive, non-prescriptive).
  * **Length window** (within target token budget).
* **Thresholds**: promote new prompt version only if **+Δ ≥ pre-agreed** on **held-out** test set and **no regression** on coverage and tone.
* **Shadow testing**: For a % of traffic, run 120B primary and 20B shadow to compare cost/quality; log both.
* **Rollback**: keep last N prompt versions; server feature flag enables instant rollback.

---

## 11) Daily determinism & caching

* **Idempotency keys**: `user_id + date_utc` to prevent duplicate reads.
* **Seed derivation**: server-side HMAC; store seed with reading.
* **Caching**: If a reading exists for user/date & prompt_version, reuse unless the user requests regeneration (admin-only during experiments).

---

## 12) Notifications & PWA

* **Service worker**: cache shell + last N readings; background fetch to refresh. MDN “offline-first” pattern. ([MDN Web Docs][12])
* **Push**: store VAPID subscription; send a “time-boxed” daily nudge (user’s local morning). Follow Push API best practices to avoid spam. ([MDN Web Docs][18])

---

## 13) Telemetry & cost

* Log Groq **usage** and **latency** per request; compute per-reading cost and rolling monthly cost. Groq response objects include a `usage` section and model id for auditing; their API reference documents these fields. ([GroqCloud][13])
* Track **thumb rate**, **opt-in rate**, **7-day return rate**, **avg. time to first token**, **completion rate**.

---

## 14) Experiment scaffolding

* **Model gating**:

  * Dev/backtests: `openai/gpt-oss-20b`.
  * Prod default: `openai/gpt-oss-120b`.
  * Feature flag `READING_MODEL=20b|120b|auto` with latency/cost guardrails. Groq’s models page gives TPM/RPM to size concurrency. ([GroqCloud][1])
* **Prompt versions**: semantic versioning; recorded in `readings.prompt_version`.
* **A/B coverage**: random user bucketing; ensure **daily determinism** still holds within bucket.

---

## 15) Deployment

* **Web app**: containerized SolidStart server.
* **Offline pipeline**: separate container with cron (nightly) to run DSPy optimizations and backtests; **write results** to DuckDB file in a dedicated **writer** job to minimize contention.
* **Secrets management**: environment variables for Groq, Lucia, VAPID private key.

---

## 16) Risks & hard truths (and how we mitigate)

* **Binary feedback is weak signal** → add optional rationale & 3–5 tags; weight rationales in sampling for DSPy Examples. ([Medium][11])
* **DuckDB write contention** → single-writer pattern + append-only tables + retry on conflict; batch maintenance windows. ([DuckDB][17])
* **LLM drift/cost spikes** → model fallback (20B), streaming short-circuit if TTFB > threshold, and explicit token caps; Groq rate limits monitored. ([GroqCloud][1])
* **Ethical concerns** → DSPy **Assertions** to forbid prescriptive/medical/legal content and enforce disclaimers. ([arXiv][8])
* **PWA fatigue** → follow Push best practices; low-friction opt-out. ([MDN Web Docs][19])

---

## 17) Acceptance criteria (MVP)

1. Users get a **daily deterministic** reading that **streams** within 1.5s TTFB on median connections; reading reproducible by seed.
2. **Feedback** submitted and stored; nightly DSPy backtest runs and outputs a metric report; no manual code edits needed to ship a new prompt version after positive eval. ([dspy.ai][20])
3. PWA installable; **offline** shows last reading; **push** reminder fires at user’s morning window. ([MDN Web Docs][12])
4. All reads & evals logged in DuckDB; **experiment audits** reproducible.

---

## 18) Implementation notes & decisions the agent must lock in

**Frontend**

* SolidStart SSR + API routes; short-lived request handlers for reading/feedback. ([docs.solidjs.com][5])
* Streaming UI for tokens; skeleton states; optimistic UI for thumbs.

**Inference**

* Groq client configured once per process; **OpenAI-compatible** payloads; **model** field set to `openai/gpt-oss-120b` (prod) or `openai/gpt-oss-20b` (dev). ([GroqCloud][13])
* System instructions contain: product tone policy, disclaimer requirement, JSON-like structure (enforced with Assertions downstream).

**DSPy**

* LM adapter: provider string `"openai/<model>"` with `api_base` pointing to Groq’s OpenAI endpoint. (DSPy’s `LM` interface is designed for OpenAI-style backends.) ([dspy.ai][2])
* Optimizer: start **MIPROv2**; explore **BootstrapFewShot** for few-shot curation benchmarks. ([dspy.ai][7])
* Metrics: implement rubric as functions returning floats; register with `Evaluate`. ([dspy.ai][14])

**DuckDB**

* Database file per environment (`tarot.duckdb`); periodic compaction; parquet exports with good row groups when archiving. ([DuckDB][16])
* Single writer worker handles nightly merges/updates to avoid contention; API routes do append-only inserts.

**PWA**

* Service worker: cache strategy “offline-first” for shell + last reading; background sync for logs if offline. ([MDN Web Docs][12])
* Push: server stores VAPID keys and subscriptions; schedule reminders in user’s local timezone.

---

## 19) Test plan (must pass)

* **Functional**: seed reproducibility; card coverage in output; history pagination; feedback persists; Push subscription lifecycle.
* **Latency**: p50 TTFB < 1.5s on 120B via Groq; p95 < 3.0s; fallback to 20B if SLA breached. (Groq model catalog indicates throughput/limits to size concurrency.) ([GroqCloud][1])
* **Eval**: nightly backtest produces metric trends; promotion blocked if any guard metric regresses.
* **Security**: CSRF tokens verified on mutating endpoints; no secrets leak to client. ([Lucia v3][6])
* **Offline**: install PWA; airplane mode shows last reading; push test notification received. ([MDN Web Docs][12])

---

## 20) Deliverables

* SolidStart repo (frontend + API routes) + Dockerfile.
* Python repo (DSPy pipeline, schedulers, DuckDB analytics) + Dockerfile.
* Environment manifests (prod/stage/dev), VAPID keys, CI workflow.
* Data dictionary for DuckDB, experiment playbook, rollback guide.
* MONOREPO STRUCTURE FOR ALL OF THIS

---

### References (key docs)

* **Groq API**: Chat Completions endpoint and response schema; model catalog lists **`openai/gpt-oss-20b`** and **`openai/gpt-oss-120b`**. ([GroqCloud][13])
* **DSPy**: LM adapter & provider strings; **MIPROv2**; **Evaluate** & **metrics**; **BootstrapFewShot** optimizer. ([dspy.ai][2])
* **DuckDB**: OLAP, ACID & optimistic concurrency; parquet row-group sizing. ([DuckDB][3])
* **SolidStart**: routing + API routes. **Lucia**: CSRF caveat. ([docs.solidjs.com][9])
* **PWA**: Service Worker & Push API (MDN) best practices. ([MDN Web Docs][12])
* **Feedback design**: binary + nuanced options rationale. ([Medium][11])

---

If you want, I can turn this into a punch-list with owner/timeline next.

[1]: https://console.groq.com/docs/models "Supported Models - GroqDocs"
[2]: https://dspy.ai/api/models/LM/?utm_source=chatgpt.com "dspy.LM"
[3]: https://duckdb.org/?utm_source=chatgpt.com "DuckDB – An in-process SQL OLAP database management system"
[4]: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API?utm_source=chatgpt.com "Service Worker API - MDN Web Docs"
[5]: https://docs.solidjs.com/solid-start/building-your-application/api-routes?utm_source=chatgpt.com "API routes - SolidStart Docs"
[6]: https://v3.lucia-auth.com/getting-started/solidstart?utm_source=chatgpt.com "Getting started in SolidStart - Lucia v3 documentation"
[7]: https://dspy.ai/api/optimizers/MIPROv2/?utm_source=chatgpt.com "MIPROv2"
[8]: https://arxiv.org/abs/2312.13382?utm_source=chatgpt.com "DSPy Assertions: Computational Constraints for Self-Refining Language Model Pipelines"
[9]: https://docs.solidjs.com/solid-start/building-your-application/routing?utm_source=chatgpt.com "Routing - SolidStart Docs - Solid Docs"
[10]: https://www.nngroup.com/articles/user-feedback/?utm_source=chatgpt.com "User-Feedback Requests: 5 Guidelines - NN/g"
[11]: https://medium.com/data-science-at-microsoft/beyond-thumbs-up-and-thumbs-down-a-human-centered-approach-to-evaluation-design-for-llm-products-d2df5c821da5?utm_source=chatgpt.com "A human-centered approach to evaluation design for LLM products ..."
[12]: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers?utm_source=chatgpt.com "Using Service Workers - Web APIs | MDN"
[13]: https://console.groq.com/docs/api-reference "API Reference - GroqDocs"
[14]: https://dspy.ai/learn/evaluation/metrics/?utm_source=chatgpt.com "Metrics"
[15]: https://mlflow.org/docs/3.1.3/genai/flavors/dspy/optimizer/?utm_source=chatgpt.com "DSPy Optimizer Autologging"
[16]: https://duckdb.org/docs/stable/guides/performance/file_formats.html?utm_source=chatgpt.com "File Formats"
[17]: https://duckdb.org/2024/10/30/analytics-optimized-concurrent-transactions.html?utm_source=chatgpt.com "Analytics-Optimized Concurrent Transactions"
[18]: https://developer.mozilla.org/en-US/docs/Web/API/Push_API?utm_source=chatgpt.com "Push API - MDN Web Docs - Mozilla"
[19]: https://developer.mozilla.org/en-US/docs/Web/API/Push_API/Best_Practices?utm_source=chatgpt.com "Web Push API Notifications best practices - MDN Web Docs"
[20]: https://dspy.ai/api/evaluation/Evaluate/?utm_source=chatgpt.com "dspy.Evaluate"

