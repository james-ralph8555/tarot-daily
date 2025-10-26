import { createHmac, randomBytes } from "node:crypto";
import { Lucia, TimeSpan, type Adapter, type Session, type User } from "lucia";
import { Scrypt } from "oslo/password";
import { serialize, parse as parseCookie } from "cookie";
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

const adapter: Adapter = {
  getUser: async (userId) => {
    const rows = await query<DatabaseUser>(
      `SELECT id, email, hashed_password, created_at FROM users WHERE id = ?`,
      { params: [userId] }
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id: row.id,
      attributes: {
        email: row.email,
        hashedPassword: row.hashed_password,
        createdAt: row.created_at
      }
    };
  },

  getSession: async (sessionId) => {
    const rows = await query<DatabaseSession>(
      `SELECT id, user_id, csrf_token, expires_at, created_at FROM sessions WHERE id = ?`,
      { params: [sessionId] }
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      id: row.id,
      userId: row.user_id,
      attributes: {
        csrfToken: row.csrf_token
      },
      expiresAt: new Date(row.expires_at),
      fresh: false
    };
  },

  getUserSessions: async (userId) => {
    const rows = await query<DatabaseSession>(
      `SELECT id, user_id, csrf_token, expires_at, created_at FROM sessions WHERE user_id = ?`,
      { params: [userId] }
    );
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      attributes: {
        csrfToken: row.csrf_token
      },
      expiresAt: new Date(row.expires_at),
      fresh: false
    }));
  },

  setUser: async (user) => {
    await run(
      `INSERT INTO users (id, email, hashed_password, created_at) VALUES (?, ?, ?, current_timestamp)`,
      {
        params: [user.id, user.attributes.email, user.attributes.hashedPassword]
      }
    );
  },

  updateUser: async (userId, attributes) => {
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

  deleteUser: async (userId) => {
    await run(`DELETE FROM sessions WHERE user_id = ?`, { params: [userId] });
    await run(`DELETE FROM users WHERE id = ?`, { params: [userId] });
  },

  setSession: async (session) => {
    await run(
      `INSERT INTO sessions (id, user_id, csrf_token, expires_at, created_at) VALUES (?, ?, ?, ?, current_timestamp)`,
      {
        params: [session.id, session.userId, session.attributes.csrfToken, session.expiresAt.toISOString()]
      }
    );
  },

  updateSession: async (sessionId, attributes) => {
    const sets: string[] = [];
    const params: unknown[] = [];
    if (attributes.attributes?.csrfToken) {
      sets.push("csrf_token = ?");
      params.push(attributes.attributes.csrfToken);
    }
    if (attributes.expiresAt) {
      sets.push("expires_at = ?");
      params.push(attributes.expiresAt.toISOString());
    }
    if (!sets.length) return;
    params.push(sessionId);
    await run(`UPDATE sessions SET ${sets.join(", ")} WHERE id = ?`, { params });
  },

  deleteSession: async (sessionId) => {
    await run(`DELETE FROM sessions WHERE id = ?`, { params: [sessionId] });
  },

  deleteUserSessions: async (userId) => {
    await run(`DELETE FROM sessions WHERE user_id = ?`, { params: [userId] });
  }
};

const env = getEnv();

export const lucia = new Lucia(adapter, {
  sessionExpiresIn: new TimeSpan(30, "d"),
  sessionCookie: {
    name: "dt_session",
    attributes: {
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      httpOnly: true
    }
  },
  getUserAttributes: (attributes) => ({
    email: attributes.email as string,
    createdAt: attributes.createdAt as string
  }),
  getSessionAttributes: (attributes) => ({
    csrfToken: attributes.csrfToken as string
  })
});

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
  const authRequest = lucia.handleRequest(request);
  return authRequest.validateUser();
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
