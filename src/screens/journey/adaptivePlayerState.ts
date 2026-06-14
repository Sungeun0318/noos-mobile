import type {
  AdaptiveAction,
  AdaptiveNextGenStatus,
  AdaptiveSegmentView,
  AdaptiveSessionResponse,
  AdaptiveWearStatus,
} from '@/api/adaptiveTypes';
import { normalizeAdaptivePlanet } from '@/api/adaptiveTypes';
import { PLANETS, type PlanetId } from '@/theme';

export interface AdaptivePlayerSnapshot {
  session: AdaptiveSessionResponse | null;
  segments: AdaptiveSegmentView[];
  lastAction: AdaptiveAction | null;
  lastSignalScore: number | null;
  nextGenStatus: AdaptiveNextGenStatus;
  wearStatus: AdaptiveWearStatus;
}

export interface AdaptivePlayerViewModel {
  sessionId: string | null;
  planet: PlanetId;
  planetTitle: string;
  trackTitle: string;
  subtitle: string;
  currentSegment: AdaptiveSegmentView | null;
  currentSegmentLabel: string;
  nextGenLabel: string;
  nextGenTone: 'idle' | 'working' | 'ready' | 'failed';
  canPlayCurrent: boolean;
  audioId: string | null;
  durationSec: number;
  wearLabel: string;
  signalLabel: string;
  actionLabel: string | null;
}

function latestSegment(
  segments: AdaptiveSegmentView[],
  predicate: (segment: AdaptiveSegmentView) => boolean,
) {
  return [...segments].reverse().find(predicate) ?? null;
}

export function pickCurrentSegment(
  session: AdaptiveSessionResponse | null,
  segments: AdaptiveSegmentView[],
) {
  return (
    session?.currentSegment ??
    latestSegment(segments, (segment) =>
      segment.status === 'ready' || segment.status === 'playing' || segment.status === 'done',
    ) ??
    segments[0] ??
    null
  );
}

export function getSegmentStatusLabel(segment: AdaptiveSegmentView | null) {
  if (!segment) {
    return '현재 음악 대기 중';
  }

  switch (segment.status) {
    case 'pending':
      return '현재 음악 생성 대기 중';
    case 'generating':
      return '현재 음악 생성 중';
    case 'ready':
      return '현재 음악 재생 준비 완료';
    case 'playing':
      return '현재 음악 재생 중';
    case 'done':
      return '현재 음악 재생 완료';
    case 'failed':
      return '현재 음악 생성 실패';
    default:
      return '현재 음악 상태 확인 중';
  }
}

export function getNextGenState(status: AdaptiveNextGenStatus): {
  label: string;
  tone: AdaptivePlayerViewModel['nextGenTone'];
} {
  switch (status) {
    case 'pending':
      return { label: 'EEG 변화 분석 중', tone: 'working' };
    case 'generating':
      return { label: '다음 음악 생성 중', tone: 'working' };
    case 'ready':
      return { label: '다음 음악 준비 완료 · 현재 곡이 끝나면 자연스럽게 전환됩니다', tone: 'ready' };
    case 'failed':
      return { label: '다음 음악 생성 실패', tone: 'failed' };
    case 'idle':
    default:
      return { label: '다음 음악 대기 중', tone: 'idle' };
  }
}

export function getWearLabel(status: AdaptiveWearStatus) {
  switch (status) {
    case 'worn':
      return 'Muse 착용 중';
    case 'uncertain':
      return 'Muse 신호 확인 중';
    case 'off':
      return 'Muse 신호가 약해 세션을 일시 정지했어요';
    case 'unknown':
    default:
      return '착용 상태 확인 중';
  }
}

export function getSignalLabel(signalScore: number | null) {
  if (signalScore === null) {
    return '신호 대기';
  }

  return `신호 ${Math.round(signalScore * 100)}%`;
}

export function buildAdaptivePlayerViewModel(snapshot: AdaptivePlayerSnapshot): AdaptivePlayerViewModel {
  const session = snapshot.session;
  const currentSegment = pickCurrentSegment(session, snapshot.segments);
  const planet = normalizeAdaptivePlanet(currentSegment?.planet ?? session?.currentPlanet ?? session?.initialPlanet);
  const planetMeta = PLANETS[planet];
  const nextGen = getNextGenState(snapshot.nextGenStatus);
  const canPlayCurrent = currentSegment?.status === 'ready' && Boolean(currentSegment.audioId);

  return {
    actionLabel: snapshot.lastAction?.label ?? null,
    audioId: currentSegment?.audioId ?? null,
    canPlayCurrent,
    currentSegment,
    currentSegmentLabel: getSegmentStatusLabel(currentSegment),
    durationSec: currentSegment?.durationSec ?? 0,
    nextGenLabel: nextGen.label,
    nextGenTone: nextGen.tone,
    planet,
    planetTitle: planetMeta.title,
    sessionId: session?.sessionId ?? null,
    signalLabel: getSignalLabel(snapshot.lastSignalScore),
    subtitle: planetMeta.description,
    trackTitle: currentSegment ? `${planetMeta.trackName} · ${currentSegment.index + 1}` : planetMeta.trackName,
    wearLabel: getWearLabel(snapshot.wearStatus),
  };
}
