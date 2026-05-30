import type { PlanetId } from '@/theme';

export type TodayMockVariant = 'filled' | 'empty';

export interface TodayStateSummary {
  label: string;
  measuredAtLabel: string;
  sourceLabel: string;
}

export interface TodayRecommendedPlanet {
  planet: PlanetId;
  title: string;
  subtitle: string;
}

export interface TodayRecentSession {
  id: string;
  title: string;
  planet: PlanetId;
  completedAtLabel: string;
}

export interface TodayMockData {
  state: TodayStateSummary | null;
  recommendedPlanet: TodayRecommendedPlanet;
  recentSession: TodayRecentSession | null;
}

export const todayMockVariant: TodayMockVariant = 'filled';

const filledMock: TodayMockData = {
  state: {
    label: 'calm focus',
    measuredAtLabel: '오늘 오후 2:10',
    sourceLabel: '수동 측정',
  },
  recommendedPlanet: {
    planet: 'mars',
    title: 'Mars',
    subtitle: '시작 에너지를 끌어올리기 좋은 상태예요',
  },
  recentSession: {
    id: 'mock-recent-neptune',
    title: 'Neptune Drift',
    planet: 'neptune',
    completedAtLabel: '어제 완료',
  },
};

const emptyMock: TodayMockData = {
  state: null,
  recommendedPlanet: {
    planet: 'neptune',
    title: 'Neptune',
    subtitle: '측정 후 더 정확해져요',
  },
  recentSession: null,
};

export function getTodayMockData(variant: TodayMockVariant = todayMockVariant) {
  return variant === 'empty' ? emptyMock : filledMock;
}
