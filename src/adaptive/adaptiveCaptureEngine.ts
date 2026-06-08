import type { AdaptiveWindowSubmitRequest, AdaptiveWindowSubmitResponse } from '@/api/adaptiveTypes';
import { submitWindow as submitAdaptiveWindow } from '@/api/adaptiveGateway';
import type { MeasureEeg } from '@/api/types';
import type { CaptureTickWithBands } from '@/adaptive/adaptiveLiveState';
import { dominantBand as resolveDominantBand } from '@/screens/measure/eegBands';
import { museGateway as defaultMuseGateway } from '@/screens/measure/museGateway';
import type { MuseMeasureOptions, MuseMeasureTick } from '@/screens/measure/museSimulator';
import { useAdaptiveSessionStore } from '@/stores/adaptiveSessionStore';
import {
  createInitialWearDetectorState,
  defaultWearDetectorConfig,
  reduceWearDetector,
  type WearDetectorConfig,
  type WearDetectorInput,
  type WearDetectorState,
} from '@/adaptive/wearDetector';

const defaultWindowSec = 300;
const defaultSignalThreshold = 0.35;

interface AdaptiveCaptureMuseGateway {
  measure(
    durationSec: number,
    onTick: (tick: MuseMeasureTick) => void,
    options?: MuseMeasureOptions,
  ): Promise<MeasureEeg>;
}

interface AdaptiveCaptureGateway {
  submitWindow(
    sessionId: string,
    payload: AdaptiveWindowSubmitRequest,
  ): Promise<AdaptiveWindowSubmitResponse>;
}

interface AdaptiveCaptureStore {
  getState(): {
    session: { sessionId: string; status: string } | null;
    nextWindowIndex: number;
    wearStatus: 'worn' | 'uncertain' | 'off' | 'unknown';
    applyWindowResult(
      response: AdaptiveWindowSubmitResponse,
      submittedWindow?: AdaptiveWindowSubmitRequest,
    ): void;
    setCaptureTick(tick: CaptureTickWithBands): void;
    setWearStatus(status: 'worn' | 'uncertain' | 'off' | 'unknown'): void;
  };
}

export interface AdaptiveCaptureLoopOptions {
  sessionId: string;
  windowSec?: number;
  signalThreshold?: number;
  wearDetectorConfig?: Partial<WearDetectorConfig>;
  museGateway?: AdaptiveCaptureMuseGateway;
  adaptiveGateway?: AdaptiveCaptureGateway;
  store?: AdaptiveCaptureStore;
  now?: () => number;
  maxWindows?: number;
}

export interface AdaptiveCaptureLoop {
  start(): Promise<void>;
  stop(): void;
  isRunning(): boolean;
}

function defaultNow() {
  return Date.now();
}

function isAbortError(error: unknown) {
  return error instanceof Error && (
    error.name === 'AbortError' ||
    error.message.toLowerCase().includes('aborted')
  );
}

function sessionIsActive(store: AdaptiveCaptureStore, sessionId: string) {
  const session = store.getState().session;

  return session?.sessionId === sessionId && session.status === 'active';
}

export function buildAdaptiveWindowRequest(input: {
  eeg: MeasureEeg;
  signalThreshold?: number;
  windowIndex: number;
  windowStartAt: string;
  windowSec: number;
}): AdaptiveWindowSubmitRequest {
  const qualityScore = input.eeg.signalQuality;

  return {
    bands: {
      alpha: input.eeg.bands.alpha,
      beta: input.eeg.bands.beta,
      delta: input.eeg.bands.delta,
      gamma: input.eeg.bands.gamma,
      theta: input.eeg.bands.theta,
    },
    dominantBand: resolveDominantBand(input.eeg.bands),
    qualityScore,
    sampleCount: input.eeg.sampleCount,
    sampleRateHz: input.eeg.sampleRateHz,
    signalOk: qualityScore >= (input.signalThreshold ?? defaultSignalThreshold),
    windowDurationSec: input.windowSec,
    windowIndex: input.windowIndex,
    windowStartAt: input.windowStartAt,
  };
}

export function createAdaptiveCaptureLoop(options: AdaptiveCaptureLoopOptions): AdaptiveCaptureLoop {
  const windowSec = options.windowSec ?? defaultWindowSec;
  const signalThreshold = options.signalThreshold ?? defaultSignalThreshold;
  const muse = options.museGateway ?? defaultMuseGateway;
  const adaptiveGateway = options.adaptiveGateway ?? {
    submitWindow: submitAdaptiveWindow,
  };
  const store = options.store ?? useAdaptiveSessionStore;
  const now = options.now ?? defaultNow;
  const wearConfig = {
    ...defaultWearDetectorConfig,
    ...(options.wearDetectorConfig ?? {}),
    signalThreshold,
  };
  let running = false;
  let stopped = false;
  let activeAbortController: AbortController | null = null;
  let runningPromise: Promise<void> | null = null;
  let wearState: WearDetectorState = createInitialWearDetectorState(store.getState().wearStatus);

  function applyWear(input: WearDetectorInput) {
    wearState = reduceWearDetector(wearState, input, wearConfig);
    store.getState().setWearStatus(wearState.status);

    return wearState.status;
  }

  async function run() {
    let windowIndex = store.getState().nextWindowIndex;
    let completedWindows = 0;

    while (!stopped && sessionIsActive(store, options.sessionId)) {
      if (options.maxWindows !== undefined && completedWindows >= options.maxWindows) {
        break;
      }

      const windowStartAt = new Date(now()).toISOString();
      const abortController = new AbortController();
      activeAbortController = abortController;

      try {
        const eeg = await muse.measure(windowSec, (tick) => {
          store.getState().setCaptureTick({
            bands: tick.bands,
            elapsedSec: tick.elapsedSec,
            sampleBufferLen: tick.sampleBufferLen,
            signalScore: tick.signalScore,
          });
          applyWear({
            bleConnected: true,
            now: now(),
            packetReceived: true,
            signalScore: tick.signalScore,
          });
        }, { signal: abortController.signal });

        if (stopped || abortController.signal.aborted) {
          break;
        }

        const request = buildAdaptiveWindowRequest({
          eeg,
          signalThreshold,
          windowIndex,
          windowSec,
          windowStartAt,
        });
        applyWear({
          bands: request.bands,
          bleConnected: true,
          now: now(),
          packetReceived: true,
          qualityScore: request.qualityScore,
        });
        const response = await adaptiveGateway.submitWindow(options.sessionId, request);

        store.getState().applyWindowResult(response, request);
        windowIndex += 1;
        completedWindows += 1;
      } catch (error) {
        if (stopped || isAbortError(error)) {
          break;
        }

        stopped = true;
        throw error;
      } finally {
        if (activeAbortController === abortController) {
          activeAbortController = null;
        }
      }
    }
  }

  return {
    isRunning: () => running,
    start: async () => {
      if (runningPromise) {
        return runningPromise;
      }

      stopped = false;
      running = true;
      runningPromise = run().finally(() => {
        running = false;
        runningPromise = null;
        activeAbortController = null;
      });

      return runningPromise;
    },
    stop: () => {
      stopped = true;
      activeAbortController?.abort();
    },
  };
}
