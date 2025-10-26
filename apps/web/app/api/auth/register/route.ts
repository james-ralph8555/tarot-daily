import { createEmailPasswordUser, createSession } from "../../../../server/auth";
import { json } from "../../../../lib/json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.json();
  const email = typeof payload?.email === "string" ? payload.email.toLowerCase().trim() : null;
  const password = typeof payload?.password === "string" ? payload.password : null;

  if (!email || !password || password.length < 8) {
    return json({ error: "invalid_payload" }, { status: 400 });
  }

  try {
    console.log("Creating user...");
    const userId = await createEmailPasswordUser(email, password);
    console.log("User created successfully:", userId);
    
    console.log("Creating session...");
    const sessionBundle = await createSession(userId);
    console.log("Session created successfully");

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
    console.error("Registration error:", error);
    return json({ error: (error as Error).message }, { status: 400 });
  }
}
