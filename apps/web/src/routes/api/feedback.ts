import type { APIEvent } from "@solidjs/start/server";
import { json } from "@solidjs/start/server";
import { readCsrfToken, validateCsrf, validateRequest } from "../../server/auth";
import { getFeedback, upsertFeedback } from "../../server/feedback";

export async function GET(event: APIEvent) {
  const auth = await validateRequest(event.request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(event.request.url);
  const readingId = url.searchParams.get("readingId");
  if (!readingId) {
    return json({ error: "missing_reading_id" }, { status: 400 });
  }
  const feedback = await getFeedback(readingId, auth.user.id);
  return json({ feedback });
}

export async function POST(event: APIEvent) {
  const auth = await validateRequest(event.request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  const csrfValid = validateCsrf(readCsrfToken(event.request), event.request.headers.get("x-csrf-token"));
  if (!csrfValid) {
    return json({ error: "invalid_csrf" }, { status: 403 });
  }

  const payload = await event.request.json();
  const readingId = payload?.readingId;
  const thumb = payload?.thumb;
  if (typeof readingId !== "string" || (thumb !== 1 && thumb !== -1)) {
    return json({ error: "invalid_payload" }, { status: 400 });
  }

  const rationale =
    typeof payload?.rationale === "string" ? payload.rationale.slice(0, 1000) : undefined;

  const feedback = await upsertFeedback({
    readingId,
    userId: auth.user.id,
    thumb,
    rationale
  });

  return json({ feedback });
}
