-- Migration to align feedback schema with implementation
-- Update feedback table to use thumb/rationale instead of rating/comment

BEGIN;

-- Add new columns
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS thumb INTEGER CHECK (thumb IN (1, -1));
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS rationale TEXT;

-- Create composite unique constraint for feedback upsert
ALTER TABLE feedback ADD CONSTRAINT unique_reading_user_feedback UNIQUE (reading_id, user_id);

-- Migrate existing data if any
UPDATE feedback 
SET 
    thumb = CASE 
        WHEN rating >= 4 THEN 1 
        WHEN rating <= 2 THEN -1 
        ELSE NULL 
    END,
    rationale = comment
WHERE thumb IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_tags ON feedback USING GIN(tags);

-- Drop old columns (comment, rating) after migration
-- Note: This is destructive - ensure data is migrated first
-- ALTER TABLE feedback DROP COLUMN IF EXISTS rating;
-- ALTER TABLE feedback DROP COLUMN IF EXISTS comment;

COMMIT;