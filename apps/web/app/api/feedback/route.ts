import { json } from "../../../lib/json";
import { readCsrfToken, validateCsrf, validateRequest } from "../../../server/auth";
import { getFeedback, upsertFeedback } from "../../../server/feedback";
import { storeTelemetryEvents } from "../../../server/telemetry";
import { telemetryEventSchema } from "../../../lib/telemetry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await validateRequest(request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(request.url);
  const readingId = url.searchParams.get("readingId");
  if (!readingId) {
    return json({ error: "missing_reading_id" }, { status: 400 });
  }
  const feedback = await getFeedback(readingId, auth.user.id);
  return json({ feedback });
}

export async function POST(request: Request) {
  const auth = await validateRequest(request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  const csrfValid = validateCsrf(readCsrfToken(request), request.headers.get("x-csrf-token"));
  if (!csrfValid) {
    return json({ error: "invalid_csrf" }, { status: 403 });
  }

  const payload = await request.json();
  const readingId = payload?.readingId;
  const thumb = payload?.thumb;
  if (typeof readingId !== "string" || (thumb !== 1 && thumb !== -1)) {
    return json({ error: "invalid_payload" }, { status: 400 });
  }

  const rationale = typeof payload?.rationale === "string" ? payload.rationale.slice(0, 1000) : undefined;
  const tags = Array.isArray(payload?.tags) ? payload.tags.slice(0, 5) : undefined;

  const feedback = await upsertFeedback({
    readingId,
    userId: auth.user.id,
    thumb,
    rationale,
    tags
  });

  // Track telemetry events
  try {
    const telemetryEvents = payload?.telemetry;
    if (Array.isArray(telemetryEvents)) {
      const validEvents = telemetryEvents
        .map(event => telemetryEventSchema.parse({ ...event, userId: auth.user!.id }))
        .filter(event => ['feedback_submitted', 'thumb_up', 'thumb_down'].includes(event.type));
      
      if (validEvents.length > 0) {
        await storeTelemetryEvents(validEvents);
      }
    }
  } catch (error) {
    console.warn('Failed to store telemetry events:', error);
  }

  return json({ feedback });
}
