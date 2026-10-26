import type { HealthStatus, SessionLighting } from '@/api/types';

export type LightingGatewayMode = 'mock' | 'real';
export type LightingSurface = 'single' | 'adaptive';
export type LightingSwitchState = 'unavailable' | 'on' | 'waiting' | 'off';

export const LIGHTING_SWITCH_LABEL: Record<LightingSwitchState, string> = {
  off: '조명 OFF',
  on: '조명 ON',
  unavailable: '조명 미연결',
  waiting: '조명 대기',
};

export const LIGHTING_SWITCH_ACCESSIBILITY_LABEL: Record<LightingSwitchState, string> = {
  off: '조명 켜기',
  on: '조명 끄기',
  unavailable: '조명 미연결',
  waiting: '조명 끄기',
};

// 세션을 만든 시점의 게이트웨이로 판단한다. 재생 중에 시뮬레이션 모드를 바꿔도 조명 요청이 엉뚱한 곳으로 가지 않는다.
// mock 세션 ID 는 session_mock_* / adaptive_mock_* (enqueueMock, adaptiveMock).
export function lightingModeForSession(sessionId: string): LightingGatewayMode {
  return sessionId.includes('_mock_') ? 'mock' : 'real';
}

// 시뮬레이션(mock) 세션은 백엔드 음악 생성을 거치지 않으니 조명도 붙지 않는다.
export function isLightingAvailable(input: {
  mode: LightingGatewayMode;
  healthLighting: HealthStatus | null | undefined;
}) {
  return input.mode === 'real' && input.healthLighting === 'ok';
}

export function getLightingUnavailableText(mode: LightingGatewayMode) {
  return mode === 'mock' ? '시뮬레이션 모드에서는 조명을 쓰지 않아요.' : '조명 미연결';
}

// 적응형은 켜 두면 다음 곡 생성 때 불이 들어오므로 "대기"가 있다. 단일 세션은 더 생성될 곡이 없어 on/off 뿐이다.
export function getLightingSwitchState(input: {
  available: boolean;
  lighting: SessionLighting | null | undefined;
  surface: LightingSurface;
}): LightingSwitchState {
  if (!input.available) {
    return 'unavailable';
  }

  if (input.lighting?.active) {
    return 'on';
  }

  return input.surface === 'adaptive' && input.lighting?.enabled ? 'waiting' : 'off';
}

export function getNextLightingEnabled(state: LightingSwitchState) {
  return state === 'off';
}

// 켰는데 서버가 아직 불을 켜지 못한 경우(첫 곡 생성 전, 일시정지 중, 서버 재시작으로 조명값 유실).
export function getLightingToggleNotice(input: {
  requested: boolean;
  result: SessionLighting;
  surface: LightingSurface;
}) {
  if (!input.requested || input.result.active) {
    return null;
  }

  return input.surface === 'adaptive'
    ? '세션이 진행되면 다음 곡부터 조명이 켜져요.'
    : '이 곡의 조명 정보를 찾지 못했어요. 새 세션부터 다시 적용돼요.';
}
