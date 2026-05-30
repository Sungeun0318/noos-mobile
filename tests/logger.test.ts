import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatLogLine, logger } from '@/lib/logger';

describe('logger buffer', () => {
  beforeEach(() => {
    logger.clear();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps recent lines and drops old entries after 200', () => {
    const log = logger.create('test');

    Array.from({ length: 205 }).forEach((_, index) => {
      log.warn(`line-${index}`);
    });

    const lines = logger.lines();

    expect(lines).toHaveLength(200);
    expect(lines[0]?.message).toBe('line-5');
    expect(lines[199]?.message).toBe('line-204');
  });

  it('formats a line for export', () => {
    const line = {
      at: '2026-05-30T00:00:00.000Z',
      level: 'info' as const,
      message: 'ready',
      module: 'debug',
      meta: { ok: true },
    };

    expect(formatLogLine(line)).toContain('INFO [debug] ready {"ok":true}');
  });

  it('redacts sensitive metadata in formatted lines', () => {
    const line = {
      at: '2026-05-30T00:00:00.000Z',
      level: 'warn' as const,
      message: 'blocked',
      module: 'debug',
      meta: { accessToken: 'dummy-token' },
    };

    expect(formatLogLine(line)).toContain('"accessToken":"[redacted]"');
  });
});
