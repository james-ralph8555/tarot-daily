import type { APIEvent } from "@solidjs/start/server";
import { json } from "@solidjs/start/server";
import { listReadings } from "../../server/reading";
import { validateRequest } from "../../server/auth";

export async function GET(event: APIEvent) {
  const auth = await validateRequest(event.request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(event.request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "10");
  const cursor = url.searchParams.get("cursor");
  const history = await listReadings({
    userId: auth.user.id,
    limit: Number.isFinite(limitParam) ? limitParam : 10,
    cursor
  });
  return json(history);
}
