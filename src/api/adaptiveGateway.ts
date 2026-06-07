import type {
  AdaptiveSessionResponse,
  AdaptiveSessionStartRequest,
  AdaptiveSessionStartResponse,
  AdaptiveSessionStatusResponse,
  AdaptiveFeedbackRequest,
  AdaptiveFeedbackResponse,
  AdaptiveWindowSubmitRequest,
  AdaptiveWindowSubmitResponse,
  PauseAdaptiveSessionRequest,
} from '@/api/adaptiveTypes';
import {
  endAdaptiveSessionMock,
  getAdaptiveSessionMock,
  pauseAdaptiveSessionMock,
  resumeAdaptiveSessionMock,
  startAdaptiveSessionMock,
  submitAdaptiveFeedbackMock,
  submitAdaptiveWindowMock,
} from '@/api/adaptiveMock';
import { useSettingsStore } from '@/stores/settingsStore';

export type AdaptiveGatewayMode = 'mock' | 'real';

export function currentAdaptiveGatewayMode(
  simulationMode = useSettingsStore.getState().simulationMode,
  adaptiveBackendReal = useSettingsStore.getState().adaptiveBackendReal,
): AdaptiveGatewayMode {
  if (adaptiveBackendReal) {
    return 'real';
  }

  return simulationMode ? 'mock' : 'real';
}

export async function startAdaptiveSession(
  payload: AdaptiveSessionStartRequest,
  mode: AdaptiveGatewayMode = currentAdaptiveGatewayMode(),
): Promise<AdaptiveSessionStartResponse> {
  if (mode === 'mock') {
    return startAdaptiveSessionMock(payload);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.adaptive.start(payload);
}

export async function getAdaptiveSession(
  sessionId: string,
  mode: AdaptiveGatewayMode = currentAdaptiveGatewayMode(),
): Promise<AdaptiveSessionResponse> {
  if (mode === 'mock') {
    return getAdaptiveSessionMock(sessionId);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.adaptive.get(sessionId);
}

export async function submitWindow(
  sessionId: string,
  payload: AdaptiveWindowSubmitRequest,
  mode: AdaptiveGatewayMode = currentAdaptiveGatewayMode(),
): Promise<AdaptiveWindowSubmitResponse> {
  if (mode === 'mock') {
    return submitAdaptiveWindowMock(sessionId, payload);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.adaptive.submitWindow(sessionId, payload);
}

export async function pauseAdaptiveSession(
  sessionId: string,
  payload: PauseAdaptiveSessionRequest = {},
  mode: AdaptiveGatewayMode = currentAdaptiveGatewayMode(),
): Promise<AdaptiveSessionStatusResponse> {
  if (mode === 'mock') {
    return pauseAdaptiveSessionMock(sessionId, payload);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.adaptive.pause(sessionId, payload);
}

export async function resumeAdaptiveSession(
  sessionId: string,
  mode: AdaptiveGatewayMode = currentAdaptiveGatewayMode(),
): Promise<AdaptiveSessionStatusResponse> {
  if (mode === 'mock') {
    return resumeAdaptiveSessionMock(sessionId);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.adaptive.resume(sessionId);
}

export async function endAdaptiveSession(
  sessionId: string,
  mode: AdaptiveGatewayMode = currentAdaptiveGatewayMode(),
): Promise<AdaptiveSessionStatusResponse> {
  if (mode === 'mock') {
    return endAdaptiveSessionMock(sessionId);
  }

  const { noosApi } = await import('@/api/noosApi');

  return noosApi.adaptive.end(sessionId);
}

export async function submitAdaptiveFeedback(
  sessionId: string,
  payload: AdaptiveFeedbackRequest,
  mode: AdaptiveGatewayMode = currentAdaptiveGatewayMode(),
): Promise<AdaptiveFeedbackResponse> {
  if (mode === 'mock') {
    return submitAdaptiveFeedbackMock(sessionId, payload);
  }

  const { noosApi } = await import('@/api/noosApi');

  // TODO BE-D2: wire once POST /api/mobile/adaptive/sessions/{id}/feedback exists.
  return noosApi.adaptive.feedback(sessionId, payload);
}
