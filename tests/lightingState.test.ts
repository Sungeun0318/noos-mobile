import { describe, expect, it } from 'vitest';

import { setAdaptiveSessionLighting, setSessionLighting, stopLighting } from '@/api/lightingGateway';
import {
  getLightingSwitchState,
  getLightingToggleNotice,
  getLightingUnavailableText,
  getNextLightingEnabled,
  isLightingAvailable,
  shouldRequestLighting,
} from '@/lighting/lightingState';

describe('lightingState', () => {
  it('offers lighting only for real backend sessions with WiZ configured', () => {
    expect(isLightingAvailable({ healthLighting: 'ok', mode: 'real' })).toBe(true);
    expect(isLightingAvailable({ healthLighting: 'ok', mode: 'mock' })).toBe(false);
    expect(isLightingAvailable({ healthLighting: 'unknown', mode: 'real' })).toBe(false);
    expect(isLightingAvailable({ healthLighting: undefined, mode: 'real' })).toBe(false);
  });

  it('tells simulation mode apart from a missing WiZ setup', () => {
    expect(getLightingUnavailableText('mock')).toBe('시뮬레이션 모드에서는 조명을 쓰지 않아요.');
    expect(getLightingUnavailableText('real')).toBe('조명 미연결');
  });

  it('requests lighting only when available and preferred', () => {
    expect(shouldRequestLighting({ available: true, preferred: true })).toBe(true);
    expect(shouldRequestLighting({ available: false, preferred: true })).toBe(false);
    expect(shouldRequestLighting({ available: true, preferred: false })).toBe(false);
  });

  it('shows on only while the session actually holds the bulbs', () => {
    expect(getLightingSwitchState({ available: false, lighting: { active: true, enabled: true }, surface: 'single' })).toBe(
      'unavailable',
    );
    expect(getLightingSwitchState({ available: true, lighting: { active: true, enabled: true }, surface: 'single' })).toBe('on');
    expect(getLightingSwitchState({ available: true, lighting: { active: false, enabled: true }, surface: 'single' })).toBe('off');
    expect(getLightingSwitchState({ available: true, lighting: null, surface: 'single' })).toBe('off');
  });

  it('shows waiting for adaptive sessions that turn on with the next segment', () => {
    expect(getLightingSwitchState({ available: true, lighting: { active: false, enabled: true }, surface: 'adaptive' })).toBe(
      'waiting',
    );
    expect(getLightingSwitchState({ available: true, lighting: { active: false, enabled: false }, surface: 'adaptive' })).toBe(
      'off',
    );
  });

  it('turns lighting on only from off, otherwise off', () => {
    expect(getNextLightingEnabled('off')).toBe(true);
    expect(getNextLightingEnabled('on')).toBe(false);
    expect(getNextLightingEnabled('waiting')).toBe(false);
  });

  it('explains when lighting was requested but is not lit yet', () => {
    expect(
      getLightingToggleNotice({ requested: true, result: { active: false, enabled: true }, surface: 'adaptive' }),
    ).toBe('세션이 진행되면 다음 곡부터 조명이 켜져요.');
    expect(
      getLightingToggleNotice({ requested: true, result: { active: false, enabled: true }, surface: 'single' }),
    ).toBe('이 곡의 조명 정보를 찾지 못했어요. 새 세션부터 다시 적용돼요.');
    expect(getLightingToggleNotice({ requested: true, result: { active: true, enabled: true }, surface: 'single' })).toBeNull();
    expect(getLightingToggleNotice({ requested: false, result: { active: false, enabled: false }, surface: 'single' })).toBeNull();
  });
});

describe('lightingGateway mock mode', () => {
  it('never reports lit lighting for simulated sessions', async () => {
    await expect(setSessionLighting('session_mock', true, 'mock')).resolves.toEqual({ active: false, enabled: true });
    await expect(setAdaptiveSessionLighting('adaptive_mock', false, 'mock')).resolves.toEqual({
      active: false,
      enabled: false,
    });
    await expect(stopLighting('mock')).resolves.toBeUndefined();
  });
});
