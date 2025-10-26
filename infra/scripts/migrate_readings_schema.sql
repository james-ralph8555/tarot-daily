-- Migration script to update readings table schema
-- This adds the missing columns that the application code expects

-- First, create any missing ENUM types
CREATE TYPE IF NOT EXISTS tone_enum AS ENUM ('reflective', 'direct', 'inspirational', 'cautious', 'warm-analytical');

-- Add missing columns to readings table
ALTER TABLE readings 
ADD COLUMN IF NOT EXISTS iso_date TEXT,
ADD COLUMN IF NOT EXISTS hmac TEXT,
ADD COLUMN IF NOT EXISTS intent TEXT,
ADD COLUMN IF NOT EXISTS prompt_version TEXT DEFAULT 'v1.deterministic',
ADD COLUMN IF NOT EXISTS overview TEXT,
ADD COLUMN IF NOT EXISTS card_breakdowns JSONB,
ADD COLUMN IF NOT EXISTS synthesis TEXT,
ADD COLUMN IF NOT EXISTS actionable_reflection TEXT,
ADD COLUMN IF NOT EXISTS model TEXT;

-- Rename 'question' column to 'intent' if it exists and 'intent' doesn't
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'readings' AND column_name = 'question')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'readings' AND column_name = 'intent') THEN
        ALTER TABLE readings RENAME COLUMN question TO intent;
    END IF;
END $$;

-- Drop the old 'interpretation' column if the new columns exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'readings' AND column_name = 'interpretation')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'readings' AND column_name = 'overview') THEN
        ALTER TABLE readings DROP COLUMN interpretation;
    END IF;
END $$;

-- Update the tone enum default if needed
ALTER TABLE readings ALTER COLUMN tone SET DEFAULT 'warm-analytical';

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_readings_iso_date ON readings(iso_date);
CREATE INDEX IF NOT EXISTS idx_readings_user_iso_date ON readings(user_id, iso_date);