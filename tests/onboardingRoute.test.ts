import { describe, expect, it } from 'vitest';

import { getPostBootRoute } from '@/navigation/postBootRoute';

describe('getPostBootRoute', () => {
  it('routes first launch to onboarding before checking backend URL', () => {
    expect(getPostBootRoute(false, 'http://localhost:8080')).toBe('Onboarding');
  });

  it('routes onboarded users with backend URL to main tabs', () => {
    expect(getPostBootRoute(true, 'http://localhost:8080')).toBe('MainTabs');
  });

  it('routes onboarded users without backend URL to settings home', () => {
    expect(getPostBootRoute(true, '')).toBe('Settings/Home');
  });
});
