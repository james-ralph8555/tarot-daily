import { json } from "../../../lib/json";
import { listReadings } from "../../../server/reading";
import { validateRequest } from "../../../server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await validateRequest(request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = Number(url.searchParams.get("limit") ?? "10");
  const cursor = url.searchParams.get("cursor");

  const history = await listReadings({
    userId: auth.user.id,
    limit: Number.isFinite(limitParam) ? limitParam : 10,
    cursor
  });

  return json(history);
}
