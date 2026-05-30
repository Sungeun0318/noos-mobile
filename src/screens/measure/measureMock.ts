import type { MeasureEeg, MeasureResponse, MeasureSurvey } from '@/api/types';
import { normalizeSurveyDraft } from '@/stores/stateStore';

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function measureMock(
  survey: MeasureSurvey | null | undefined,
  eegOrDelayMs?: MeasureEeg | number | null,
  delayMs = 900,
): Promise<MeasureResponse> {
  const eeg = typeof eegOrDelayMs === 'number' ? null : eegOrDelayMs;
  const effectiveDelayMs = typeof eegOrDelayMs === 'number' ? eegOrDelayMs : delayMs;

  // TODO FE-XX: replace measureMock with noosApi.state.measure(...) when live measure wiring starts.
  if (effectiveDelayMs > 0) {
    await delay(effectiveDelayMs);
  }

  const normalized = normalizeSurveyDraft(survey ?? {});
  const eegBoost = eeg ? Math.min(0.18, eeg.bands.alpha / 180) : 0;
  const eegStress = eeg ? Math.min(0.16, eeg.bands.beta / 220) : 0;
  const stressLoad = Math.min(1, normalized.stress * (eeg ? 0.7 : 1) + eegStress);
  const fatigueRisk = Math.min(1, normalized.fatigue * (eeg ? 0.78 : 1) + (eeg ? eeg.bands.delta / 180 : 0));
  const relaxationLevel = Math.min(1, normalized.relaxation + (eeg ? eeg.bands.theta / 220 : 0));
  const focusReadiness = Math.min(1, normalized.focus + eegBoost);
  const mentalWorkload = Math.min(1, Math.max(0, stressLoad * 0.6 + focusReadiness * 0.4));
  const corticalArousal = Math.min(
    1,
    Math.max(0, focusReadiness * 0.5 + (1 - fatigueRisk) * 0.3 + stressLoad * 0.2),
  );
  const highStress = stressLoad > 0.68 || fatigueRisk > 0.72;
  const highFocus = focusReadiness > 0.65 && stressLoad < 0.55;
  const source = eeg ? (survey ? 'hybrid' : 'eeg') : 'survey';

  return {
    measurementId: `mock_meas_${Math.round(Date.now() / 1000)}`,
    stateLabel: highStress ? 'overloaded recovery' : highFocus ? 'calm focus' : 'steady reset',
    currentState: {
      focus_readiness: focusReadiness,
      stress_load: stressLoad,
      fatigue_risk: fatigueRisk,
      relaxation_level: relaxationLevel,
      cortical_arousal: corticalArousal,
      mental_workload: mentalWorkload,
    },
    recommendedPlanet: highStress ? 'Neptune' : highFocus ? 'Mars' : 'Saturn',
    alternates: highStress ? ['Saturn', 'Earth'] : highFocus ? ['Mercury', 'Earth'] : ['Neptune', 'Earth'],
    confidence: eeg ? 0.82 : normalized.intentText ? 0.76 : 0.62,
    source,
    weight: { survey: eeg ? 0.45 : 1, eeg: eeg ? 0.55 : 0 },
    measuredAt: new Date().toISOString(),
  };
}
