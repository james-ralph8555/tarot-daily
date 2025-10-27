import { query, run } from "./db";
import { telemetryEventSchema, type TelemetryEvent } from "../lib/telemetry";

export async function storeTelemetryEvents(events: TelemetryEvent[]) {
  if (!events.length) return;

  const values = events.map((event, index) => {
    const i = index * 7; // 7 parameters per event
    return `($${i + 1}, $${i + 2}, $${i + 3}, $${i + 4}, $${i + 5}, $${i + 6}, $${i + 7})`;
  }).join(', ');

  const params = events.flatMap(event => [
    event.type,
    event.sessionId,
    event.timestamp,
    event.userId || null,
    JSON.stringify(event.data),
    JSON.stringify(event.metadata),
    JSON.stringify(event)
  ]);

  await run(
    `INSERT INTO telemetry_events (type, session_id, timestamp, user_id, data, metadata, raw_event)
     VALUES ${values}`,
    { params }
  );
}

export async function getTelemetryMetrics(
  startDate?: Date,
  endDate?: Date
) {
  let whereClause = "1=1";
  const params: any[] = [];

  if (startDate) {
    whereClause += ` AND timestamp >= $${params.length + 1}`;
    params.push(startDate.toISOString());
  }

  if (endDate) {
    whereClause += ` AND timestamp <= $${params.length + 1}`;
    params.push(endDate.toISOString());
  }

  // Get all events in date range
  const events = await query(
    `SELECT * FROM telemetry_events WHERE ${whereClause} ORDER BY timestamp`,
    { params }
  );

  const completedReadings = events.filter((e: any) => e.type === 'reading_completed');
  const submittedFeedback = events.filter((e: any) => e.type === 'feedback_submitted');
  const thumbUps = events.filter((e: any) => e.type === 'thumb_up');
  const timeToFirstTokens = events
    .filter((e: any) => e.type === 'reading_time_to_first_token')
    .map((e: any) => {
      const data = JSON.parse(e.data || '{}');
      return data.timeToFirstToken || 0;
    })
    .filter(t => t > 0);

  // Calculate 7-day return rate
  const sevenDayReturnRate = await calculateSevenDayReturnRate(startDate, endDate);

  const metrics = {
    thumbRate: submittedFeedback.length > 0 ? thumbUps.length / submittedFeedback.length : 0,
    optInRate: completedReadings.length > 0 ? submittedFeedback.length / completedReadings.length : 0,
    sevenDayReturnRate,
    avgTimeToFirstToken: timeToFirstTokens.length > 0 
      ? timeToFirstTokens.reduce((a, b) => a + b, 0) / timeToFirstTokens.length 
      : 0,
    completionRate: await calculateCompletionRate(startDate, endDate),
    totalReadings: completedReadings.length,
    totalFeedback: submittedFeedback.length,
    totalEvents: events.length,
    uniqueSessions: new Set(events.map((e: any) => e.session_id)).size,
    uniqueUsers: new Set(events.filter((e: any) => e.user_id).map((e: any) => e.user_id)).size
  };

  return metrics;
}

async function calculateSevenDayReturnRate(startDate?: Date, endDate?: Date): Promise<number> {
  // Get user sessions and track returns within 7 days
  const userSessions = await query(`
    SELECT 
      user_id,
      MIN(timestamp) as first_session,
      COUNT(DISTINCT DATE(timestamp)) as session_days
    FROM telemetry_events 
    WHERE user_id IS NOT NULL 
      AND type = 'session_start'
      ${startDate ? 'AND timestamp >= $1' : ''}
      ${endDate ? 'AND timestamp <= $2' : ''}
    GROUP BY user_id
  `, { 
    params: [startDate?.toISOString(), endDate?.toISOString()].filter(Boolean) 
  });

  if (!userSessions.length) return 0;

  const returningUsers = userSessions.filter((session: any) => session.session_days >= 2);
  return returningUsers.length / userSessions.length;
}

async function calculateCompletionRate(startDate?: Date, endDate?: Date): Promise<number> {
  const startedReadings = await query(`
    SELECT COUNT(DISTINCT session_id) as started_count
    FROM telemetry_events 
    WHERE type = 'reading_started'
      ${startDate ? 'AND timestamp >= $1' : ''}
      ${endDate ? 'AND timestamp <= $2' : ''}
  `, { 
    params: [startDate?.toISOString(), endDate?.toISOString()].filter(Boolean) 
  });

  const completedReadings = await query(`
    SELECT COUNT(DISTINCT session_id) as completed_count
    FROM telemetry_events 
    WHERE type = 'reading_completed'
      ${startDate ? 'AND timestamp >= $1' : ''}
      ${endDate ? 'AND timestamp <= $2' : ''}
  `, { 
    params: [startDate?.toISOString(), endDate?.toISOString()].filter(Boolean) 
  });

  const started = (startedReadings[0] as any)?.started_count || 0;
  const completed = (completedReadings[0] as any)?.completed_count || 0;

  return started > 0 ? completed / started : 0;
}

export async function getGroqUsageMetrics(startDate?: Date, endDate?: Date) {
  let whereClause = "1=1";
  const params: any[] = [];

  if (startDate) {
    whereClause += ` AND created_at >= $${params.length + 1}`;
    params.push(startDate.toISOString());
  }

  if (endDate) {
    whereClause += ` AND created_at <= $${params.length + 1}`;
    params.push(endDate.toISOString());
  }

  const usage = await query(`
    SELECT 
      model,
      COUNT(*) as request_count,
      SUM(prompt_tokens) as total_prompt_tokens,
      SUM(completion_tokens) as total_completion_tokens,
      SUM(total_tokens) as total_tokens,
      AVG(latency_ms) as avg_latency_ms,
      MIN(created_at) as first_request,
      MAX(created_at) as last_request
    FROM groq_usage
    WHERE ${whereClause}
    GROUP BY model
    ORDER BY total_tokens DESC
  `, { params });

  // Calculate costs (example pricing - adjust based on actual Groq pricing)
  const pricing = {
    'openai/gpt-oss-20b': { prompt: 0.0002, completion: 0.0006 }, // per 1K tokens
    'openai/gpt-oss-120b': { prompt: 0.001, completion: 0.003 }
  };

  return usage.map((record: any) => {
    const modelPricing = pricing[record.model as keyof typeof pricing] || { prompt: 0, completion: 0 };
    const cost = (record.total_prompt_tokens / 1000 * modelPricing.prompt) + 
                 (record.total_completion_tokens / 1000 * modelPricing.completion);
    
    return {
      ...record,
      estimated_cost: cost,
      avg_cost_per_request: cost / record.request_count
    };
  });
}