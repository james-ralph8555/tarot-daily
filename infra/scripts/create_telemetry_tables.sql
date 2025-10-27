-- Create telemetry and usage tracking tables

BEGIN;

-- Telemetry events table
CREATE TABLE IF NOT EXISTS telemetry_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type TEXT NOT NULL,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    data JSONB,
    metadata JSONB,
    raw_event JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Groq API usage tracking
CREATE TABLE IF NOT EXISTS groq_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reading_id UUID REFERENCES readings(id) ON DELETE SET NULL,
    model TEXT NOT NULL,
    prompt_tokens INTEGER NOT NULL,
    completion_tokens INTEGER NOT NULL,
    total_tokens INTEGER NOT NULL,
    latency_ms INTEGER NOT NULL,
    request_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    response_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    cost_cents INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_telemetry_events_timestamp ON telemetry_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_type ON telemetry_events(type);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_user_id ON telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_session_id ON telemetry_events(session_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_events_type_timestamp ON telemetry_events(type, timestamp);

CREATE INDEX IF NOT EXISTS idx_groq_usage_timestamp ON groq_usage(request_timestamp);
CREATE INDEX IF NOT EXISTS idx_groq_usage_model ON groq_usage(model);
CREATE INDEX IF NOT EXISTS idx_groq_usage_user_id ON groq_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_groq_usage_reading_id ON groq_usage(reading_id);

COMMIT;