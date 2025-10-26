import type { Reading } from "../../../lib/common";
import { json } from "../../../lib/json";
import { ensureReading } from "../../../server/reading";
import type { SpreadType } from "../../../lib/seed";
import { readCsrfToken, validateCsrf, validateRequest } from "../../../server/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await validateRequest(request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }
  
  if (!auth.user.id) {
    return json({ error: "invalid_user" }, { status: 401 });
  }
  
  const url = new URL(request.url);
  const isoDate = url.searchParams.get("date") ?? nowIsoDate();
  const spreadType = (url.searchParams.get("spread") as SpreadType | null) ?? "three-card";
  const { reading } = await ensureReading({
    userId: auth.user.id,
    isoDate,
    spreadType
  });
  return json(reading);
}

export async function POST(request: Request) {
  const auth = await validateRequest(request);
  if (!auth) {
    return json({ error: "unauthorized" }, { status: 401 });
  }

  if (!auth.user.id) {
    return json({ error: "invalid_user" }, { status: 401 });
  }

  const csrfValid = validateCsrf(readCsrfToken(request), request.headers.get("x-csrf-token"));
  if (!csrfValid) {
    return json({ error: "invalid_csrf" }, { status: 403 });
  }

  const payload = await request.json();
  const isoDate = typeof payload?.isoDate === "string" ? payload.isoDate : nowIsoDate();
  const spreadType: SpreadType =
    payload?.spreadType === "single" || payload?.spreadType === "celtic-cross" ? payload.spreadType : "three-card";
  const intent = typeof payload?.intent === "string" ? payload.intent.slice(0, 280) : undefined;
  const tone = typeof payload?.tone === "string" ? payload.tone : undefined;
  const force = payload?.force === true;

  const { reading, created } = await ensureReading({
    userId: auth.user.id,
    isoDate,
    intent,
    spreadType,
    tone,
    force
  });

  if (payload?.stream === false) {
    return json({ reading, created });
  }

  return streamReading(reading, created);
}

function streamReading(reading: Reading, created: boolean) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(JSON.stringify({ type: "seed", data: reading.seed }) + "\n"));
      controller.enqueue(
        encoder.encode(JSON.stringify({ type: "cards", data: reading.cards, created }) + "\n")
      );

      const deltas = [
        { section: "overview", text: reading.overview },
        ...reading.cardBreakdowns.map((item) => ({
          section: `card:${item.cardId}`,
          text: item.summary
        })),
        { section: "synthesis", text: reading.synthesis },
        { section: "actionableReflection", text: reading.actionableReflection }
      ];

      for (const delta of deltas) {
        controller.enqueue(encoder.encode(JSON.stringify({ type: "delta", data: delta }) + "\n"));
      }

      controller.enqueue(encoder.encode(JSON.stringify({ type: "final", data: reading }) + "\n"));
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
}

function nowIsoDate() {
  return new Date().toISOString().slice(0, 10);
}
