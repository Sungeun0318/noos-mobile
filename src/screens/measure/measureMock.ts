import type { MeasureResponse, MeasureSurvey } from '@/api/types';
import { normalizeSurveyDraft } from '@/stores/stateStore';

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function measureMock(survey: MeasureSurvey, delayMs = 900): Promise<MeasureResponse> {
  // TODO FE-XX: replace measureMock with noosApi.state.measure(...) when live measure wiring starts.
  if (delayMs > 0) {
    await delay(delayMs);
  }

  const normalized = normalizeSurveyDraft(survey);
  const stressLoad = normalized.stress;
  const fatigueRisk = normalized.fatigue;
  const relaxationLevel = normalized.relaxation;
  const focusReadiness = normalized.focus;
  const mentalWorkload = Math.min(1, Math.max(0, stressLoad * 0.6 + focusReadiness * 0.4));
  const corticalArousal = Math.min(1, Math.max(0, focusReadiness * 0.5 + (1 - fatigueRisk) * 0.3 + stressLoad * 0.2));
  const highStress = stressLoad > 0.68 || fatigueRisk > 0.72;
  const highFocus = focusReadiness > 0.65 && stressLoad < 0.55;

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
    confidence: normalized.intentText ? 0.76 : 0.62,
    source: 'survey',
    weight: { survey: 1, eeg: 0 },
    measuredAt: new Date().toISOString(),
  };
}
