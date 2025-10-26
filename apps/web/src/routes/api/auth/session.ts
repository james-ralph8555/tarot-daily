import type { APIEvent } from "@solidjs/start/server";
import { json } from "@solidjs/start/server";
import { validateRequest } from "../../../server/auth";

export async function GET(event: APIEvent) {
  const auth = await validateRequest(event.request);
  if (!auth) {
    return json({ user: null });
  }
  return json({
    user: {
      id: auth.user.id,
      email: auth.user.email
    }
  });
}
