import { describe, expect, it } from 'vitest';

import { labelForAdaptiveModeKey, resolveAdaptiveSessionMode } from '@/screens/journey/adaptiveSessionMode';

describe('adaptiveSessionMode', () => {
  it('labels real EEG, simulation EEG, and survey experience modes', () => {
    expect(resolveAdaptiveSessionMode('eeg', false)).toMatchObject({
      isExperience: false,
      key: 'realEeg',
      label: '실시간 EEG',
    });
    expect(resolveAdaptiveSessionMode('eeg', true)).toMatchObject({
      isExperience: true,
      key: 'simEeg',
      label: '시뮬레이션 체험',
    });
    expect(resolveAdaptiveSessionMode('survey', false)).toMatchObject({
      isExperience: true,
      key: 'survey',
      label: '설문 체험',
    });
    expect(resolveAdaptiveSessionMode('none', false)).toMatchObject({
      isExperience: true,
      key: 'none',
      label: '체험 모드',
    });
  });

  it('maps stored mode keys to display labels', () => {
    expect(labelForAdaptiveModeKey('realEeg')).toBe('실시간 EEG');
    expect(labelForAdaptiveModeKey('simEeg')).toBe('시뮬레이션 체험');
    expect(labelForAdaptiveModeKey('survey')).toBe('설문 체험');
    expect(labelForAdaptiveModeKey(null)).toBeNull();
  });
});
