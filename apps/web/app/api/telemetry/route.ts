import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "../../../server/auth";
import { storeTelemetryEvents, getTelemetryMetrics, getGroqUsageMetrics } from "../../../server/telemetry";
import { telemetryEventSchema } from "../../../lib/telemetry";

export async function POST(request: NextRequest) {
  try {
    const auth = await validateRequest(request);
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json({ error: "Expected array of events" }, { status: 400 });
    }

    // Validate and transform events
    const events = body.map(event => {
      const validated = telemetryEventSchema.parse(event);
      return {
        ...validated,
        userId: validated.userId || auth?.user?.id || undefined
      };
    });

    await storeTelemetryEvents(events);
    
    return NextResponse.json({ received: events.length });
  } catch (error) {
    console.error("Telemetry storage error:", error);
    return NextResponse.json({ error: "Failed to store events" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await validateRequest(request);
    
    // Only allow authenticated users to access metrics
    if (!auth?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start') ? new Date(searchParams.get('start')!) : undefined;
    const endDate = searchParams.get('end') ? new Date(searchParams.get('end')!) : undefined;

    const [telemetryMetrics, groqMetrics] = await Promise.all([
      getTelemetryMetrics(startDate, endDate),
      getGroqUsageMetrics(startDate, endDate)
    ]);

    return NextResponse.json({
      period: { startDate, endDate },
      telemetry: telemetryMetrics,
      groq: groqMetrics
    });
  } catch (error) {
    console.error("Telemetry metrics error:", error);
    return NextResponse.json({ error: "Failed to fetch metrics" }, { status: 500 });
  }
}