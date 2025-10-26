import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { Scrypt } from "oslo/password";
import { parse as parseCookie, serialize } from "cookie";
import { getEnv } from "./config";
import { query, run } from "./db";
import { normalizeTimestamp, parseTimestamp } from "./time";

type DatabaseUser = {
  id: string;
  email: string;
  hashed_password: string;
  created_at: string;
};

type DatabaseSession = {
  id: string;
  user_id: string;
  csrf_token: string;
  expires_at: string;
  created_at: string;
};

const env = getEnv();

export interface Session {
  id: string;
  userId: string;
  csrfToken: string;
  expiresAt: Date;
}

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

function generateSessionId(): string {
  return cryptoRandomId();
}



export async function createEmailPasswordUser(email: string, password: string) {
  console.log("Creating user for email:", email);
  const hashedPassword = await new Scrypt().hash(password);
  console.log("Hashed password created");
  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, { params: [email] });
  console.log("Existing users check completed:", existing.length);
  if (existing.length) {
    throw new Error("Email already registered");
  }
  const userId = cryptoRandomId();
  console.log("Generated user ID:", userId);
  console.log("About to insert user with params:", [userId, email, hashedPassword.substring(0, 10) + "...", new Date().toISOString()]);
  try {
  await run(`INSERT INTO users (id, email, hashed_password, created_at) VALUES ($1, $2, $3, $4)`, {
    params: [userId, email, hashedPassword, new Date().toISOString()]
  });
    console.log("User inserted successfully");
  } catch (error) {
    console.error("Failed to insert user:", error);
    if (error instanceof Error && /Duplicate key/i.test(error.message)) {
      throw new Error("Email already registered");
    }
    throw error;
  }
  return userId;
}

export async function authenticateWithPassword(email: string, password: string) {
  const rows = await query<DatabaseUser>(
    `SELECT id, email, hashed_password, created_at FROM users WHERE email = $1`,
    { params: [email] }
  );

  if (!rows.length) {
    throw new Error("Invalid credentials");
  }

  const user = rows[0];
  const valid = await new Scrypt().verify(user.hashed_password, password);
  if (!valid) {
    throw new Error("Invalid credentials");
  }

  return user.id;
}

export async function createSession(userId: string): Promise<{ session: Session; cookie: string; csrfToken: string; csrfCookie: string }> {
  console.log("Creating session for user:", userId);
  const now = new Date();
  const sessionId = generateSessionId();
  const csrfToken = generateCsrfToken();
  
  console.log("Generated session ID:", sessionId);
  console.log("Generated CSRF token:", csrfToken);
  
  const session: Session = {
    id: sessionId,
    userId,
    csrfToken,
    expiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 30) // 30 days
  };
  
  console.log("Inserting session into database...");
  try {
    await run(
      `INSERT INTO sessions (id, user_id, csrf_token, expires_at, created_at) VALUES ($1, $2, $3, $4, $5)`,
      {
        params: [session.id, session.userId, session.csrfToken, session.expiresAt.toISOString(), new Date().toISOString()]
      }
    );
    console.log("Session inserted successfully");
  } catch (error) {
    console.error("Failed to insert session:", error);
    throw error;
  }
  
  const cookie = serialize("dt_session", session.id, {
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    expires: session.expiresAt
  });
  
  const csrfCookie = createCsrfCookie(csrfToken);
  
  return {
    session,
    cookie,
    csrfToken,
    csrfCookie
  };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await run(`DELETE FROM sessions WHERE id = $1`, { params: [sessionId] });
}

type SessionWithUserRecord = {
  id: string;
  user_id: string;
  csrf_token: string;
  expires_at: string;
  created_at: string;
  user_email: string;
  user_created_at: string;
};

export async function validateRequest(request: Request): Promise<{ session: Session; user: User } | null> {
  const sessionId = readSessionIdFromRequest(request);
  if (!sessionId) return null;
  
  const rows = await query<SessionWithUserRecord>(
    `SELECT s.id, s.user_id, s.csrf_token, s.expires_at, s.created_at, u.email as user_email, u.created_at as user_created_at 
     FROM sessions s 
     JOIN users u ON s.user_id = u.id 
     WHERE s.id = $1`,
    { params: [sessionId] }
  );
  
  if (!rows.length) {
    return null;
  }

  const row = rows[0];
  const session: Session = {
    id: row.id,
    userId: row.user_id,
    csrfToken: row.csrf_token,
    expiresAt: parseTimestamp(row.expires_at)
  };
  
  if (Date.now() >= session.expiresAt.getTime()) {
    await run(`DELETE FROM sessions WHERE id = $1`, { params: [sessionId] });
    return null;
  }
  
  const user: User = {
    id: row.user_id,
    email: row.user_email,
    createdAt: normalizeTimestamp(row.user_created_at)
  };
  
  return { session, user };
}

export async function validateRequestFromHeaders(headersInit: HeadersInit): Promise<{ session: Session; user: User } | null> {
  const headers = headersInit instanceof Headers ? headersInit : new Headers(headersInit);
  const request = new Request("http://internal", { headers });
  return validateRequest(request);
}

export function readSessionIdFromRequest(request: Request) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const cookies = parseCookie(header);
  return cookies["dt_session"] ?? null;
}

export function generateCsrfToken() {
  return randomBytes(32).toString("hex");
}

export function cryptoRandomId() {
  return randomUUID();
}

export function createCsrfCookie(token: string) {
  return serialize("dt_csrf", token, {
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 3
  });
}

export function createLogoutCookies() {
  const blankSession = serialize("dt_session", "", {
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    httpOnly: true,
    maxAge: 0
  });
  const blankCsrf = serialize("dt_csrf", "", {
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    httpOnly: false,
    maxAge: 0
  });
  return {
    session: blankSession,
    csrf: blankCsrf
  };
}

export async function rotateCsrfToken(sessionId: string) {
  const token = generateCsrfToken();
  await run(`UPDATE sessions SET csrf_token = $1, created_at = $2 WHERE id = $3`, {
    params: [token, new Date().toISOString(), sessionId]
  });
  return {
    token,
    cookie: createCsrfCookie(token)
  };
}

export function readCsrfToken(request: Request) {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const cookies = parseCookie(header);
  return (cookies["dt_csrf"] as string | undefined) ?? null;
}

export function validateCsrf(csrfCookie: string | null, csrfHeader: string | null) {
  if (!csrfCookie || !csrfHeader) return false;
  return csrfCookie === csrfHeader;
}
