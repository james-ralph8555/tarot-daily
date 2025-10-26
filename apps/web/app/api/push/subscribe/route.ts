import { json } from "../../../../lib/json";
import { readCsrfToken, validateCsrf, validateRequest } from "../../../../server/auth";
import { storePushSubscription } from "../../../../server/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
  const subscription = await storePushSubscription(auth.user.id, payload);
  return json({ subscription });
}
