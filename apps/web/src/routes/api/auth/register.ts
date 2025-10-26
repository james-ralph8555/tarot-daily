import type { APIEvent } from "@solidjs/start/server";
import { json } from "@solidjs/start/server";
import { createEmailPasswordUser, createSession } from "../../../server/auth";

export async function POST(event: APIEvent) {
  const payload = await event.request.json();
  const email = typeof payload?.email === "string" ? payload.email.toLowerCase().trim() : null;
  const password = typeof payload?.password === "string" ? payload.password : null;

  if (!email || !password || password.length < 8) {
    return json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    const userId = await createEmailPasswordUser(email, password);
    const sessionBundle = await createSession(userId);

    const headers = new Headers();
    headers.append("Set-Cookie", sessionBundle.cookie);
    headers.append("Set-Cookie", sessionBundle.csrfCookie);

    return json(
      {
        user: {
          id: userId,
          email
        }
      },
      { headers }
    );
  } catch (error) {
    return json({ error: (error as Error).message }, { status: 400 });
  }
}
