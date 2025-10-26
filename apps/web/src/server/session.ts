import type { APIEvent } from "@solidjs/start/server";
import { validateRequest } from "./auth";

export async function requireSession(event: APIEvent) {
  const auth = await validateRequest(event.request);
  if (!auth) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return auth;
}

export async function getSession(event: APIEvent) {
  return validateRequest(event.request);
}
