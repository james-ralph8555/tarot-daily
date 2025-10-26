-- Initialize PostgreSQL database for Daily Tarot
-- This file is automatically run when the container starts

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user-defined type for spread types (ENUM equivalent)
CREATE TYPE spread_type_enum AS ENUM ('single', 'three-card', 'celtic-cross');

-- Create user-defined type for tone preferences
CREATE TYPE tone_enum AS ENUM ('reflective', 'direct', 'inspirational', 'cautious', 'warm-analytical');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    csrf_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Readings table
CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    iso_date TEXT NOT NULL,
    spread_type spread_type_enum NOT NULL,
    hmac TEXT NOT NULL,
    intent TEXT,
    cards JSONB NOT NULL,
    prompt_version TEXT NOT NULL DEFAULT 'v1.deterministic',
    overview TEXT NOT NULL,
    card_breakdowns JSONB NOT NULL,
    synthesis TEXT NOT NULL,
    actionable_reflection TEXT NOT NULL,
    tone tone_enum DEFAULT 'warm-analytical',
    model TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Feedback table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    reading_id UUID REFERENCES readings(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings(user_id);
CREATE INDEX IF NOT EXISTS idx_readings_created_at ON readings(created_at);
CREATE INDEX IF NOT EXISTS idx_readings_iso_date ON readings(iso_date);
CREATE INDEX IF NOT EXISTS idx_readings_user_iso_date ON readings(user_id, iso_date);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);