# DuckDB Data Dictionary

## users
| Column | Type | Description |
| --- | --- | --- |
| id | VARCHAR | Primary key for the user account (HMAC-stable identifier) |
| email | VARCHAR | Login email address (unique) |
| hashed_password | VARCHAR | Scrypt hashed password |
| created_at | TIMESTAMP | Creation timestamp |

## sessions
| Column | Type | Description |
| id | VARCHAR | Lucia session identifier |
| user_id | VARCHAR | Foreign key to `users.id` |
| csrf_token | VARCHAR | Latest CSRF token associated with the session |
| expires_at | TIMESTAMP | Session expiry timestamp |
| created_at | TIMESTAMP | Session creation timestamp |

## readings
| Column | Type | Description |
| id | VARCHAR | Reading identifier (nanoid) |
| user_id | VARCHAR | Foreign key to `users.id` |
| iso_date | VARCHAR | UTC date string for the reading |
| spread_type | VARCHAR | Spread type (`single`, `three-card`, `celtic-cross`) |
| hmac | VARCHAR | Deterministic seed derived from user and date |
| intent | VARCHAR | Optional user intent |
| cards | JSON | Array of card draws `{cardId, orientation, position}` |
| prompt_version | VARCHAR | Prompt version used for generation |
| overview | TEXT | Summary text |
| card_breakdowns | JSON | Array of per-card breakdowns |
| synthesis | TEXT | Combined narrative |
| actionable_reflection | TEXT | Closing reflection prompt |
| tone | VARCHAR | Response tone |
| model | VARCHAR | Groq model used |
| created_at | TIMESTAMP | Creation timestamp |

## feedback
| Column | Type | Description |
| reading_id | VARCHAR | Foreign key to `readings.id` |
| user_id | VARCHAR | Foreign key to `users.id` |
| thumb | INTEGER | Binary feedback (+1/-1) |
| rationale | TEXT | Optional qualitative feedback |
| created_at | TIMESTAMP | Timestamp of last update |

## prompt_versions
| Column | Type | Description |
| id | VARCHAR | Prompt identifier (file stem) |
| status | VARCHAR | `draft`, `candidate`, `promoted`, or `rolled_back` |
| optimizer | VARCHAR | Optimizer name (e.g., `MIPROv2`) |
| metadata | JSON | Arbitrary optimizer metadata |
| created_at | TIMESTAMP | Creation timestamp |

## evaluation_runs
| Column | Type | Description |
| id | VARCHAR | Evaluation run identifier |
| prompt_version_id | VARCHAR | Foreign key to `prompt_versions.id` |
| dataset | VARCHAR | Dataset name evaluated |
| metrics | JSON | Array of metric objects `{name, value, threshold?}` |
| guardrail_violations | JSON | Array of guardrail keys triggered |
| created_at | TIMESTAMP | Timestamp of evaluation |

## push_subscriptions
| Column | Type | Description |
| user_id | VARCHAR | Foreign key to `users.id` |
| endpoint | VARCHAR | Push endpoint (primary key) |
| expiration_time | BIGINT | Optional expiration epoch |
| keys | JSON | VAPID keys {p256dh, auth} |
| created_at | TIMESTAMP | Stored timestamp |

## training_datasets
| Column | Type | Description |
| dataset | VARCHAR | Dataset identifier |
| payload | JSON | Serialized `TrainingExample` payload |
| created_at | TIMESTAMP | Inserted timestamp |
