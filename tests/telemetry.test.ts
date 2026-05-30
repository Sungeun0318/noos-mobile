import { beforeEach, describe, expect, it, vi } from 'vitest';

import { formatTelemetryEvent, noosTelemetry } from '@/lib/telemetry';

describe('noosTelemetry', () => {
  beforeEach(() => {
    noosTelemetry.clear();
  });

  it('does not throw when tracking an event', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(() => noosTelemetry.track('smoke_event', { ok: true })).not.toThrow();

    consoleSpy.mockRestore();
  });

  it('keeps the latest 100 telemetry events', () => {
    Array.from({ length: 105 }).forEach((_, index) => {
      noosTelemetry.track(`event_${index}`, { ok: true });
    });

    const events = noosTelemetry.recentEvents();

    expect(events).toHaveLength(100);
    expect(events[0]?.event).toBe('event_5');
    expect(events[99]?.event).toBe('event_104');
  });

  it('formats an event for export', () => {
    noosTelemetry.track('debug_view', { ok: true });

    expect(formatTelemetryEvent(noosTelemetry.recentEvents()[0])).toContain('debug_view {"ok":true}');
  });

  it('redacts sensitive telemetry props when formatting', () => {
    noosTelemetry.track('debug_event', { refreshToken: 'dummy-token' });

    expect(formatTelemetryEvent(noosTelemetry.recentEvents()[0])).toContain(
      '"refreshToken":"[redacted]"',
    );
  });
});
