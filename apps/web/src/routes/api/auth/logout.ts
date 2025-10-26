import type { APIEvent } from "@solidjs/start/server";
import { json } from "@solidjs/start/server";
import { createLogoutCookies, invalidateSession, readSessionIdFromRequest } from "../../../server/auth";

export async function POST(event: APIEvent) {
  const sessionId = readSessionIdFromRequest(event.request);
  if (sessionId) {
    await invalidateSession(sessionId);
  }
  const headers = new Headers();
  const blanks = createLogoutCookies();
  headers.append("Set-Cookie", blanks.session);
  headers.append("Set-Cookie", blanks.csrf);
  return json({ success: true }, { headers });
}
