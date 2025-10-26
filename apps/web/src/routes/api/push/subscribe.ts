import type { APIEvent } from "@solidjs/start/server";
import { json } from "@solidjs/start/server";
import { storePushSubscription } from "../../../server/push";
import { readCsrfToken, validateCsrf, validateRequest } from "../../../server/auth";

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
  const subscription = await storePushSubscription(auth.user.id, payload);
  return json({ subscription });
}
