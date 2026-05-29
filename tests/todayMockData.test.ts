import { describe, expect, it } from 'vitest';

import { getTodayMockData } from '@/screens/today/mockData';

describe('today mock data', () => {
  it('provides a shell scenario with state, pending session, and recent session', () => {
    const data = getTodayMockData('filled');

    expect(data.state?.label).toBe('calm focus');
    expect(data.pendingSessions).toHaveLength(1);
    expect(data.recentSession?.title).toBe('Neptune Drift');
  });

  it('provides an empty scenario with default Neptune recommendation and hidden blocks', () => {
    const data = getTodayMockData('empty');

    expect(data.state).toBeNull();
    expect(data.recommendedPlanet).toMatchObject({
      planet: 'neptune',
      subtitle: '측정 후 더 정확해져요',
    });
    expect(data.pendingSessions).toHaveLength(0);
    expect(data.recentSession).toBeNull();
  });
});
