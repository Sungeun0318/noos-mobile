import { describe, expect, it, vi } from 'vitest';

import { noosTelemetry } from '@/lib/telemetry';

describe('noosTelemetry', () => {
  it('does not throw when tracking an event', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    expect(() => noosTelemetry.track('smoke_event', { ok: true })).not.toThrow();

    consoleSpy.mockRestore();
  });
});
