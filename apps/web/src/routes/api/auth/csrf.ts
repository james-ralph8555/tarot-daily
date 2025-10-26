import type { APIEvent } from "@solidjs/start/server";
import { json } from "@solidjs/start/server";
import { rotateCsrfToken, validateRequest } from "../../../server/auth";

export async function POST(event: APIEvent) {
  const auth = await validateRequest(event.request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  const rotated = await rotateCsrfToken(auth.session.id);
  const headers = new Headers();
  headers.append("Set-Cookie", rotated.cookie);
  return json({ csrfToken: rotated.token }, { headers });
}
