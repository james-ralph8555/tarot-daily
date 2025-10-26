# PostgreSQL Data Dictionary

## Types

### spread_type_enum
ENUM('single', 'three-card', 'celtic-cross') - Valid spread types for readings

### tone_enum  
ENUM('reflective', 'direct', 'inspirational', 'cautious', 'warm-analytical') - Response tone preferences

## users
| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key for the user account |
| email | VARCHAR(255) | Login email address (unique) |
| hashed_password | TEXT | Scrypt hashed password |
| created_at | TIMESTAMPTZ | Creation timestamp |

## sessions
| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Session identifier |
| user_id | UUID | Foreign key to `users.id` |
| csrf_token | TEXT | CSRF token for the session |
| expires_at | TIMESTAMPTZ | Session expiry timestamp |
| created_at | TIMESTAMPTZ | Session creation timestamp |

## readings
| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Reading identifier |
| user_id | UUID | Foreign key to `users.id` |
| iso_date | TEXT | UTC date string for the reading |
| spread_type | spread_type_enum | Spread type (`single`, `three-card`, `celtic-cross`) |
| hmac | TEXT | Deterministic seed derived from user and date |
| intent | TEXT | Optional user intent |
| cards | JSONB | Array of card draws `{cardId, orientation, position}` |
| prompt_version | TEXT | Prompt version used for generation |
| overview | TEXT | Summary text |
| card_breakdowns | JSONB | Array of per-card breakdowns |
| synthesis | TEXT | Combined narrative |
| actionable_reflection | TEXT | Closing reflection prompt |
| tone | tone_enum | Response tone (default: 'warm-analytical') |
| model | TEXT | Groq model used |
| created_at | TIMESTAMPTZ | Creation timestamp |

## feedback
| Column | Type | Description |
| --- | --- | --- |
| id | UUID | Primary key |
| user_id | UUID | Foreign key to `users.id` |
| reading_id | UUID | Foreign key to `readings.id` |
| rating | INTEGER | Rating from 1-5 |
| comment | TEXT | Optional qualitative feedback |
| created_at | TIMESTAMPTZ | Timestamp of creation |