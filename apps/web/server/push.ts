import type { PushSubscription } from "@daily-tarot/common";
import { pushSubscriptionSchema } from "@daily-tarot/common";
import { query, run } from "./db";

type PushRecord = {
  user_id: string;
  endpoint: string;
  expiration_time: number | null;
  keys: string;
  created_at: string;
};

export async function storePushSubscription(userId: string, payload: unknown) {
  const parsed = pushSubscriptionSchema.parse(payload);
  await run(
    `
      INSERT INTO push_subscriptions (user_id, endpoint, expiration_time, keys, created_at)
      VALUES (?, ?, ?, ?, current_timestamp)
      ON CONFLICT (endpoint)
      DO UPDATE SET user_id = excluded.user_id, expiration_time = excluded.expiration_time, keys = excluded.keys
    `,
    {
      params: [userId, parsed.endpoint, parsed.expirationTime, JSON.stringify(parsed.keys)]
    }
  );
  return parsed;
}

export async function getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
  const rows = await query<PushRecord>(
    `SELECT user_id, endpoint, expiration_time, keys, created_at FROM push_subscriptions WHERE user_id = ?`,
    { params: [userId] }
  );
  return rows.map((row) =>
    pushSubscriptionSchema.parse({
      endpoint: row.endpoint,
      expirationTime: row.expiration_time,
      keys: JSON.parse(row.keys)
    })
  );
}
