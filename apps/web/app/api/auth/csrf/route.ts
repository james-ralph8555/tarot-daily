import { rotateCsrfToken, validateRequest } from "../../../../server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await validateRequest(request);
  if (!auth) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }
  const rotated = await rotateCsrfToken(auth.session.id);
  const headers = new Headers();
  headers.append("Set-Cookie", rotated.cookie);
  headers.append("Content-Type", "application/json");
  return new Response(JSON.stringify({ csrfToken: rotated.token }), { headers });
}
