import { beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetMMKV } from './mocks/react-native-mmkv';

describe('guestPromptState', () => {
  beforeEach(() => {
    vi.resetModules();
    __resetMMKV();
  });

  it('shows only for guest users when no active hiddenUntil exists', async () => {
    const { shouldShowGuestPrompt } = await import('@/components/guestPromptState');
    const now = 1_000;

    expect(shouldShowGuestPrompt('guest', null, now)).toBe(true);
    expect(shouldShowGuestPrompt('authed', null, now)).toBe(false);
  });

  it('hides for guest users until the hiddenUntil timestamp expires', async () => {
    const { shouldShowGuestPrompt } = await import('@/components/guestPromptState');
    const now = 1_000;

    expect(shouldShowGuestPrompt('guest', now + 1, now)).toBe(false);
    expect(shouldShowGuestPrompt('guest', now, now)).toBe(true);
  });

  it('persists a seven day hiddenUntil timestamp in MMKV', async () => {
    const {
      getGuestPromptHiddenUntil,
      guestPromptHiddenMs,
      hideGuestPromptForSevenDays,
    } = await import('@/components/guestPromptState');
    const now = 10_000;

    expect(hideGuestPromptForSevenDays(now)).toBe(now + guestPromptHiddenMs);
    expect(getGuestPromptHiddenUntil()).toBe(now + guestPromptHiddenMs);
  });
});
