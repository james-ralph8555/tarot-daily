import { z } from "zod";

export const telemetryEventSchema = z.object({
  type: z.enum([
    'reading_completed',
    'reading_started', 
    'feedback_submitted',
    'thumb_up',
    'thumb_down',
    'page_view',
    'session_start',
    'reading_time_to_first_token',
    'reading_completion_time'
  ]),
  userId: z.string().optional(),
  sessionId: z.string(),
  timestamp: z.string().datetime(),
  data: z.record(z.any()).optional(),
  metadata: z.object({
    userAgent: z.string().optional(),
    referrer: z.string().optional(),
    path: z.string().optional(),
    version: z.string().optional()
  }).optional()
});

export type TelemetryEvent = z.infer<typeof telemetryEventSchema>;

export interface TelemetryMetrics {
  thumbRate: number;
  optInRate: number;
  sevenDayReturnRate: number;
  avgTimeToFirstToken: number;
  completionRate: number;
  totalReadings: number;
  totalFeedback: number;
}

class TelemetryTracker {
  private events: TelemetryEvent[] = [];
  private startTime: number = Date.now();
  private readingStartTime: number | null = null;

  constructor() {
    this.trackSessionStart();
  }

  private trackSessionStart() {
    this.track('session_start', {
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined,
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      version: process.env.NEXT_PUBLIC_VERSION || 'unknown'
    });
  }

  track(type: TelemetryEvent['type'], data?: TelemetryEvent['data']) {
    const event: TelemetryEvent = {
      type,
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString(),
      data,
      metadata: {
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        referrer: typeof window !== 'undefined' ? document.referrer : undefined,
        path: typeof window !== 'undefined' ? window.location.pathname : undefined,
        version: process.env.NEXT_PUBLIC_VERSION || 'unknown'
      }
    };

    this.events.push(event);
    this.persistEvent(event);
  }

  startReading() {
    this.readingStartTime = Date.now();
    this.track('reading_started');
  }

  recordTimeToFirstToken() {
    if (this.readingStartTime) {
      const timeToFirstToken = Date.now() - this.readingStartTime;
      this.track('reading_time_to_first_token', { 
        timeToFirstToken,
        sessionId: this.getSessionId()
      });
    }
  }

  completeReading() {
    const completionTime = this.readingStartTime 
      ? Date.now() - this.readingStartTime 
      : null;
    
    this.track('reading_completed', {
      completionTime,
      sessionId: this.getSessionId()
    });
    
    this.readingStartTime = null;
  }

  trackFeedback(thumb: 1 | -1, tags?: string[]) {
    this.track('feedback_submitted', { thumb, tags });
    this.track(thumb === 1 ? 'thumb_up' : 'thumb_down', { tags });
  }

  trackPageView(path?: string) {
    this.track('page_view', { 
      path: path || (typeof window !== 'undefined' ? window.location.pathname : undefined)
    });
  }

  getMetrics(): TelemetryMetrics {
    const events = this.events;
    const completedReadings = events.filter(e => e.type === 'reading_completed');
    const submittedFeedback = events.filter(e => e.type === 'feedback_submitted');
    const thumbUps = events.filter(e => e.type === 'thumb_up');
    const timeToFirstTokens = events
      .filter(e => e.type === 'reading_time_to_first_token')
      .map(e => e.data?.timeToFirstToken || 0)
      .filter(t => t > 0);

    return {
      thumbRate: submittedFeedback.length > 0 ? thumbUps.length / submittedFeedback.length : 0,
      optInRate: completedReadings.length > 0 ? submittedFeedback.length / completedReadings.length : 0,
      sevenDayReturnRate: this.calculateSevenDayReturnRate(),
      avgTimeToFirstToken: timeToFirstTokens.length > 0 
        ? timeToFirstTokens.reduce((a, b) => a + b, 0) / timeToFirstTokens.length 
        : 0,
      completionRate: 0, // Would need to track started vs completed
      totalReadings: completedReadings.length,
      totalFeedback: submittedFeedback.length
    };
  }

  private calculateSevenDayReturnRate(): number {
    // Implementation would require tracking user sessions over time
    // For now, return placeholder
    return 0;
  }

  private getSessionId(): string {
    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('telemetry_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem('telemetry_session_id', sessionId);
      }
      return sessionId;
    }
    return `server_session_${Date.now()}`;
  }

  private async persistEvent(event: TelemetryEvent) {
    if (typeof window !== 'undefined') {
      // Store in localStorage for batch sending
      const existing = localStorage.getItem('telemetry_events') || '[]';
      const events = JSON.parse(existing);
      events.push(event);
      
      // Keep only last 100 events to avoid storage bloat
      if (events.length > 100) {
        events.splice(0, events.length - 100);
      }
      
      localStorage.setItem('telemetry_events', JSON.stringify(events));
      
      // Try to send events (will be implemented in server component)
      this.sendEvents();
    }
  }

  private async sendEvents() {
    if (typeof window !== 'undefined' && this.events.length > 0) {
      try {
        const response = await fetch('/api/telemetry', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(this.events),
          credentials: 'include'
        });
        
        if (response.ok) {
          // Clear stored events on successful send
          localStorage.removeItem('telemetry_events');
        }
      } catch (error) {
        console.warn('Failed to send telemetry events:', error);
      }
    }
  }

  clearEvents() {
    this.events = [];
    if (typeof window !== 'undefined') {
      localStorage.removeItem('telemetry_events');
    }
  }
}

// Singleton instance
export const telemetry = new TelemetryTracker();