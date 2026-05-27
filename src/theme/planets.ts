import { color } from './tokens';

export type PlanetId =
  | 'mercury'
  | 'venus'
  | 'earth'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto';

export const PLANET_COLORS: Record<
  PlanetId,
  { primary: string; secondary: string; accent: string }
> = {
  mercury: { primary: '#FFF3DC', secondary: '#FFB34D', accent: '#FFE28E' },
  venus: { primary: '#FFB67C', secondary: '#FFB8C8', accent: '#FFD7A8' },
  earth: { primary: '#8FE3C2', secondary: '#8DB5FF', accent: '#8DB5FF' },
  mars: { primary: '#F4F8FF', secondary: '#FF8A24', accent: '#FFC08A' },
  jupiter: { primary: '#FBE0C6', secondary: '#F0C46A', accent: '#D7B0FF' },
  saturn: { primary: '#FBB475', secondary: '#C9D0FF', accent: '#F0DEBD' },
  uranus: { primary: '#F2BE88', secondary: '#7DDFF2', accent: '#E8FFF7' },
  neptune: { primary: '#F2E1D3', secondary: '#6ECBFF', accent: '#DFF4FF' },
  pluto: { primary: '#F7AD69', secondary: '#C9D1F2', accent: '#F2F4FB' },
} as const;

export interface PlanetMeta {
  id: PlanetId;
  title: string;
  moodTarget: string;
  description: string;
  trackName: string;
  primaryColor: string;
  illustration?: number;
}

export const PLANETS: Record<PlanetId, PlanetMeta> = {
  mercury: {
    id: 'mercury',
    title: 'Mercury',
    moodTarget: 'clarity',
    description: '빠른 정리와 선명한 집중을 돕는 짧은 궤도',
    trackName: 'Mercury Focus',
    primaryColor: PLANET_COLORS.mercury.primary,
  },
  venus: {
    id: 'venus',
    title: 'Venus',
    moodTarget: 'warmth',
    description: '긴장을 낮추고 부드러운 회복감을 만드는 흐름',
    trackName: 'Venus Ease',
    primaryColor: PLANET_COLORS.venus.primary,
  },
  earth: {
    id: 'earth',
    title: 'Earth',
    moodTarget: 'balance',
    description: '몸의 리듬을 안정시키는 균형 잡힌 사운드',
    trackName: 'Earth Ground',
    primaryColor: PLANET_COLORS.earth.primary,
  },
  mars: {
    id: 'mars',
    title: 'Mars',
    moodTarget: 'activation',
    description: '에너지를 끌어올려 시작을 돕는 선명한 트랙',
    trackName: 'Mars Ignite',
    primaryColor: PLANET_COLORS.mars.primary,
  },
  jupiter: {
    id: 'jupiter',
    title: 'Jupiter',
    moodTarget: 'expansion',
    description: '넓은 호흡과 여유를 만드는 깊은 공간감',
    trackName: 'Jupiter Open',
    primaryColor: PLANET_COLORS.jupiter.primary,
  },
  saturn: {
    id: 'saturn',
    title: 'Saturn',
    moodTarget: 'structure',
    description: '산만함을 줄이고 차분한 규칙성을 회복',
    trackName: 'Saturn Ring',
    primaryColor: PLANET_COLORS.saturn.primary,
  },
  uranus: {
    id: 'uranus',
    title: 'Uranus',
    moodTarget: 'reset',
    description: '답답한 패턴을 끊고 감각을 새로 여는 흐름',
    trackName: 'Uranus Reset',
    primaryColor: PLANET_COLORS.uranus.primary,
  },
  neptune: {
    id: 'neptune',
    title: 'Neptune',
    moodTarget: 'recovery',
    description: '피로와 과부하를 낮추는 깊고 느린 물결',
    trackName: 'Neptune Drift',
    primaryColor: PLANET_COLORS.neptune.primary,
  },
  pluto: {
    id: 'pluto',
    title: 'Pluto',
    moodTarget: 'deep rest',
    description: '작고 깊은 휴식으로 감각을 조용히 정리',
    trackName: 'Pluto Quiet',
    primaryColor: PLANET_COLORS.pluto.primary,
  },
} as const;

export function planetGradient(planet: PlanetId) {
  const { primary, secondary } = PLANET_COLORS[planet];

  return {
    colors: [`${primary}26`, `${secondary}14`, color.bg.base],
    locations: [0, 0.45, 1],
  } as const;
}
