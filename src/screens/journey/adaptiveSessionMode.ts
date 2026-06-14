import type { AdaptiveSeedSource, AdaptiveSessionModeKey } from '@/api/adaptiveTypes';

export interface AdaptiveSessionModeInfo {
  key: AdaptiveSessionModeKey;
  label: string;
  description: string;
  isExperience: boolean;
}

export function resolveAdaptiveSessionMode(
  seedSource: AdaptiveSeedSource | null | undefined,
  simulationMode: boolean,
): AdaptiveSessionModeInfo {
  if (seedSource === 'survey') {
    return {
      description: '설문을 기반으로 시작한 체험 세션입니다.',
      isExperience: true,
      key: 'survey',
      label: '설문 체험',
    };
  }

  if (seedSource === 'eeg' || seedSource === 'hybrid') {
    if (simulationMode) {
      return {
        description: '시뮬레이션 EEG로 흐름을 확인하는 체험 세션입니다.',
        isExperience: true,
        key: 'simEeg',
        label: '시뮬레이션 체험',
      };
    }

    return {
      description: 'Muse EEG를 기반으로 음악을 조정한 세션입니다.',
      isExperience: false,
      key: 'realEeg',
      label: '실시간 EEG',
    };
  }

  return {
    description: 'EEG 없이 흐름을 확인하는 체험 세션입니다.',
    isExperience: true,
    key: 'none',
    label: '체험 모드',
  };
}

export function labelForAdaptiveModeKey(mode: AdaptiveSessionModeKey | null | undefined) {
  switch (mode) {
    case 'realEeg':
      return '실시간 EEG';
    case 'simEeg':
      return '시뮬레이션 체험';
    case 'survey':
      return '설문 체험';
    case 'none':
      return '체험 모드';
    default:
      return null;
  }
}

export function isExperienceAdaptiveMode(mode: AdaptiveSessionModeInfo) {
  return mode.isExperience;
}
