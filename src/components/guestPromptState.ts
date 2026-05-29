import { createMMKV } from 'react-native-mmkv';

import type { AuthMode } from '@/stores/authStore';

const storage = createMMKV({ id: 'noos.ui.v1' });
const hiddenUntilKey = 'guestPrompt.hiddenUntil';

export const guestPromptHiddenMs = 7 * 24 * 60 * 60 * 1000;

export function shouldShowGuestPrompt(mode: AuthMode, hiddenUntil: number | null, now = Date.now()) {
  return mode === 'guest' && (!hiddenUntil || hiddenUntil <= now);
}

export function getGuestPromptHiddenUntil() {
  const value = storage.getString(hiddenUntilKey);
  const parsed = value ? Number(value) : Number.NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

export function hideGuestPromptUntil(timestamp: number) {
  storage.set(hiddenUntilKey, String(timestamp));
}

export function hideGuestPromptForSevenDays(now = Date.now()) {
  const hiddenUntil = now + guestPromptHiddenMs;
  hideGuestPromptUntil(hiddenUntil);

  return hiddenUntil;
}
