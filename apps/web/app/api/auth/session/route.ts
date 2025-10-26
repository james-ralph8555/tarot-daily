import { json } from "../../../../lib/json";
import { validateRequest } from "../../../../server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await validateRequest(request);
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
