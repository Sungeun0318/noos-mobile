import { describe, expect, it } from 'vitest';

import {
  createInitialWearDetectorState,
  reduceWearDetector,
  type WearDetectorConfig,
} from '@/adaptive/wearDetector';

const config: WearDetectorConfig = {
  flatlineEpsilon: 0.0001,
  offDebounceMs: 6_000,
  packetTimeoutMs: 3_000,
  signalThreshold: 0.35,
};

describe('wearDetector', () => {
  it('debounces low signal from worn to uncertain to off', () => {
    let state = createInitialWearDetectorState('worn');

    state = reduceWearDetector(state, { now: 0, packetReceived: true, signalScore: 0.2 }, config);
    expect(state.status).toBe('uncertain');
    expect(state.reason).toBe('low_signal');

    state = reduceWearDetector(state, { now: 4_000, packetReceived: true, signalScore: 0.2 }, config);
    expect(state.status).toBe('uncertain');

    state = reduceWearDetector(state, { now: 6_000, packetReceived: true, signalScore: 0.2 }, config);
    expect(state.status).toBe('off');
  });

  it('does not turn a short signal drop into off', () => {
    let state = createInitialWearDetectorState('worn');

    state = reduceWearDetector(state, { now: 0, packetReceived: true, signalScore: 0.2 }, config);
    state = reduceWearDetector(state, { now: 2_000, packetReceived: true, signalScore: 0.8 }, config);

    expect(state.status).toBe('worn');
    expect(state.badSince).toBeNull();
  });

  it('recovers from off to worn as soon as signal is good again', () => {
    let state = createInitialWearDetectorState('worn');

    state = reduceWearDetector(state, { now: 0, packetReceived: true, signalScore: 0.1 }, config);
    state = reduceWearDetector(state, { now: 6_000, packetReceived: true, signalScore: 0.1 }, config);
    expect(state.status).toBe('off');

    state = reduceWearDetector(state, { now: 7_000, packetReceived: true, signalScore: 0.9 }, config);
    expect(state.status).toBe('worn');
  });

  it('detects packet timeout after a previously received packet', () => {
    let state = createInitialWearDetectorState('worn');

    state = reduceWearDetector(state, { now: 0, packetReceived: true, signalScore: 0.8 }, config);
    state = reduceWearDetector(state, { now: 4_000 }, config);

    expect(state.status).toBe('uncertain');
    expect(state.reason).toBe('packet_timeout');
  });

  it('detects BLE disconnect and confirms off after debounce', () => {
    let state = createInitialWearDetectorState('worn');

    state = reduceWearDetector(state, { bleConnected: false, now: 0 }, config);
    state = reduceWearDetector(state, { bleConnected: false, now: 6_000 }, config);

    expect(state.status).toBe('off');
    expect(state.reason).toBe('ble_disconnected');
  });

  it('detects invalid and flatline bands', () => {
    let state = createInitialWearDetectorState('worn');

    state = reduceWearDetector(
      state,
      {
        bands: { alpha: Number.NaN, beta: 0.2, delta: 0.1, gamma: 0.3, theta: 0.4 },
        now: 0,
      },
      config,
    );
    expect(state.reason).toBe('invalid_bands');

    state = reduceWearDetector(
      createInitialWearDetectorState('worn'),
      {
        bands: { alpha: 0.2, beta: 0.2, delta: 0.2, gamma: 0.2, theta: 0.2 },
        now: 0,
      },
      config,
    );
    expect(state.reason).toBe('flatline');
  });
});
