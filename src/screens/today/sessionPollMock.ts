import type { SessionGetResponse, SessionStatus } from '@/api/types';
import type { PendingSession } from '@/stores/sessionStore';
import { PLANETS } from '@/theme';

const queuedMs = 5_000;
const mockReadyCapSec = 30;

function percentForElapsed(elapsedMs: number, readyMs: number) {
  const generatingMs = Math.max(readyMs - queuedMs, 1);
  const elapsedGeneratingMs = Math.max(elapsedMs - queuedMs, 0);

  return Math.min(99, Math.round((elapsedGeneratingMs / generatingMs) * 100));
}

function statusForElapsed(elapsedMs: number, readyMs: number): SessionStatus {
  if (elapsedMs >= readyMs) {
    return 'ready';
  }

  if (elapsedMs >= queuedMs) {
    return 'generating';
  }

  return 'queued';
}

export async function sessionPollMock(
  session: PendingSession,
  now = Date.now(),
): Promise<SessionGetResponse> {
  // TODO FE-XX: replace sessionPollMock with noosApi.sessions.get(id) (GET /api/mobile/sessions/{id}).
  const readySec = Math.min(session.estimatedReadyInSec ?? mockReadyCapSec, mockReadyCapSec);
  const readyMs = readySec * 1_000;
  const elapsedMs = Math.max(now - session.enqueuedAt, 0);
  const status = statusForElapsed(elapsedMs, readyMs);
  const etaSec = Math.max(Math.ceil((readyMs - elapsedMs) / 1_000), 0);
  const createdAt = new Date(session.enqueuedAt).toISOString();
  const startedAt = status === 'queued' ? null : new Date(session.enqueuedAt + queuedMs).toISOString();
  const completedAt = status === 'ready' ? new Date(session.enqueuedAt + readyMs).toISOString() : null;

  return {
    audio:
      status === 'ready'
        ? {
            audioId: `audio_mock_${session.sessionId}`,
            durationSec: session.durationSec,
            streamUrl: `mock://audio/${session.sessionId}`,
          }
        : null,
    completedAt,
    createdAt,
    durationSec: session.durationSec,
    error: null,
    lighting: status === 'ready' ? { active: false, jobId: null } : null,
    planet: PLANETS[session.planet].title,
    progress:
      status === 'ready'
        ? null
        : {
            etaSec,
            percent: status === 'queued' ? 0 : percentForElapsed(elapsedMs, readyMs),
            phase: status === 'queued' ? 'queued' : 'ace_step',
          },
    sessionId: session.sessionId,
    startedAt,
    status,
    summary:
      status === 'ready'
        ? {
            description: PLANETS[session.planet].description,
            title: PLANETS[session.planet].trackName,
          }
        : null,
  };
}
