import { createLogoutCookies, invalidateSession, readSessionIdFromRequest } from "../../../../server/auth";
import { json } from "../../../../lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const sessionId = readSessionIdFromRequest(request);
  if (sessionId) {
    await invalidateSession(sessionId);
  }
  const headers = new Headers();
  const blanks = createLogoutCookies();
  headers.append("Set-Cookie", blanks.session);
  headers.append("Set-Cookie", blanks.csrf);
  return json({ success: true }, { headers });
}
