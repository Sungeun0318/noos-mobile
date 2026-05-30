import type { EnqueueSessionRequest, EnqueueSessionResponse } from '@/api/types';

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function enqueueMock(
  payload: EnqueueSessionRequest,
  delayMs = 700,
): Promise<EnqueueSessionResponse> {
  // TODO FE-07: replace enqueueMock with noosApi.sessions.create(...) (POST /api/mobile/sessions).
  if (delayMs > 0) {
    await delay(delayMs);
  }

  return {
    sessionId: `session_mock_${Math.round(Date.now() / 1000)}`,
    status: 'queued',
    planet: payload.planet,
    durationSec: payload.durationSec,
    estimatedReadyInSec: Math.max(300, Math.round(payload.durationSec * 0.8)),
    pollAfterMs: 5000,
    createdAt: new Date().toISOString(),
  };
}
