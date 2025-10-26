import { createHmac, randomBytes } from "node:crypto";
import { Scrypt } from "oslo/password";
import { parse as parseCookie, serialize } from "cookie";
import { Lucia } from "lucia";
import { getEnv } from "./config";
import { query, run } from "./db";

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

const adapter = {
  getUser: async (userId: string) => {
    const rows = await query<DatabaseUser>(
      `SELECT id, email, hashed_password, created_at FROM users WHERE id = ?`,
      { params: [userId] }
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      hashedPassword: row.hashed_password,
      createdAt: row.created_at
    };
  },

  getSessionAndUser: async (sessionId: string) => {
    const rows = await query<DatabaseSession & DatabaseUser>(
      `SELECT s.id, s.user_id, s.csrf_token, s.expires_at, s.created_at, u.email, u.hashed_password, u.created_at as user_created_at 
       FROM sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.id = ?`,
      { params: [sessionId] }
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      user: {
        id: row.user_id,
        email: row.email,
        hashedPassword: row.hashed_password,
        createdAt: row.user_created_at
      },
      session: {
        id: row.id,
        userId: row.user_id,
        csrfToken: row.csrf_token,
        expiresAt: new Date(row.expires_at)
      }
    };
  },

  getUserSessions: async (userId: string) => {
    const rows = await query<DatabaseSession>(
      `SELECT id, user_id, csrf_token, expires_at, created_at FROM sessions WHERE user_id = ?`,
      { params: [userId] }
    );
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      csrfToken: row.csrf_token,
      expiresAt: new Date(row.expires_at)
    }));
  },

  setUser: async (user: any) => {
    await run(
      `INSERT INTO users (id, email, hashed_password, created_at) VALUES (?, ?, ?, current_timestamp)`,
      {
        params: [user.id, user.email, user.hashedPassword]
      }
    );
  },

  updateUser: async (userId: string, attributes: any) => {
    if (!attributes.email && !attributes.hashedPassword) return;
    const sets: string[] = [];
    const params: unknown[] = [];
    if (attributes.email) {
      sets.push("email = ?");
      params.push(attributes.email);
    }
    if (attributes.hashedPassword) {
      sets.push("hashed_password = ?");
      params.push(attributes.hashedPassword);
    }
    params.push(userId);
    await run(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, { params });
  },

  deleteUser: async (userId: string) => {
    await run(`DELETE FROM sessions WHERE user_id = ?`, { params: [userId] });
    await run(`DELETE FROM users WHERE id = ?`, { params: [userId] });
  },

  setSession: async (session: any) => {
    await run(
      `INSERT INTO sessions (id, user_id, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, current_timestamp)`,
      {
        params: [session.id, session.userId, session.csrfToken, session.expiresAt.toISOString()]
      }
    );
  },

  updateSession: async (sessionId: string, attributes: any) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (attributes.csrfToken) {
      sets.push("csrf_token = ?");
      params.push(attributes.csrfToken);
    }
    if (attributes.expiresAt) {
      sets.push("expires_at = ?");
      params.push(attributes.expiresAt.toISOString());
    }
    if (!sets.length) return;
    params.push(sessionId);
    await run(`UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`, { params });
  },

  deleteSession: async (sessionId: string) => {
    await run(`DELETE FROM sessions WHERE id = ?`, { params: [sessionId] });
  },

  deleteUserSessions: async (userId: string) => {
    await run(`DELETE FROM sessions WHERE user_id = ?`, { params: [userId] });
  },

  deleteExpiredSessions: async () => {
    await run(`DELETE FROM sessions WHERE expires_at < current_timestamp`);
  }
};

const env = getEnv();

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: {
    activePeriod: 60 * 60 * 24 * 30, // 30 days
    idlePeriod: 60 * 60 * 24 * 30 // 30 days
  },
  sessionCookie: {
    name: "dt_session",
    expires: false,
    attributes: {
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    }
  },
  getUserAttributes: (attributes) => {
    return {
      email: attributes.email,
      createdAt: attributes.createdAt
    };
  }
});

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
  const bytes = new Uint8Array(25);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}



export async function createEmailPasswordUser(email: string, password: string) {
  const hashedPassword = await new Scrypt().hash(password);
  const existing = await query<{ id: string }>(`SELECT id FROM users WHERE email = ?`, { params: [email] });
  if (existing.length) {
    throw new Error("Email already registered");
  }
  const userId = cryptoRandomId();
  await run(`INSERT INTO users (id, email, hashed_password, created_at) VALUES (?, ?, ?, current_timestamp)`, {
    params: [userId, email, hashedPassword]
  });
  return userId;
}

export async function authenticateWithPassword(email: string, password: string) {
  const rows = await query<DatabaseUser>(
    `SELECT id, email, hashed_password, created_at FROM users WHERE email = ?`,
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

export async function createSession(userId: string) {
  const csrfToken = generateCsrfToken();
  const session = await lucia.createSession(userId, { csrfToken });
  const sessionCookie = lucia.createSessionCookie(session.id);
  const cookie = serialize(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return {
    session,
    cookie,
    csrfToken,
    csrfCookie: createCsrfCookie(csrfToken)
  };
}

export async function invalidateSession(sessionId: string) {
  await lucia.invalidateSession(sessionId);
}

export async function validateRequest(request: Request) {
  const authRequest = lucia.createSessionRequest(request);
  return authRequest.validate();
}

export async function validateRequestFromHeaders(headersInit: HeadersInit) {
  const headers = headersInit instanceof Headers ? headersInit : new Headers(headersInit);
  const request = new Request("http://internal", { headers });
  return validateRequest(request);
}

export function handleAuthRequest(request: Request) {
  return lucia.handleRequest(request);
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
  const bytes = randomBytes(32).toString("hex");
  return createHmac("sha256", env.SESSION_SECRET).update(bytes).digest("hex");
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
  const blankSession = lucia.createBlankSessionCookie();
  const blankCsrf = serialize("dt_csrf", "", {
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    httpOnly: false,
    maxAge: 0
  });
  return {
    session: serialize(blankSession.name, blankSession.value, blankSession.attributes),
    csrf: blankCsrf
  };
}

export async function rotateCsrfToken(sessionId: string) {
  const token = generateCsrfToken();
  await run(`UPDATE sessions SET csrf_token = ?, created_at = current_timestamp WHERE id = ?`, {
    params: [token, sessionId]
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
