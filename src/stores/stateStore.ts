import { createMMKV } from 'react-native-mmkv';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

import type { CurrentState, MeasureResponse, MeasureSource, MeasureSurvey } from '@/api/types';
import { PLANETS, type PlanetId } from '@/theme';

export interface SurveyDraft {
  focus: number;
  stress: number;
  fatigue: number;
  relaxation: number;
  intentText: string | null;
}

export interface StateStoreShape {
  surveyDraft: SurveyDraft | null;
  currentState: CurrentState | null;
  stateLabel: string | null;
  measurementId: string | null;
  recommendedPlanet: PlanetId | null;
  alternates: PlanetId[];
  confidence: number | null;
  source: MeasureSource | null;
  measuredAt: string | null;
  intentText: string | null;
  setSurveyDraft(survey: MeasureSurvey): void;
  setFromMeasure(response: MeasureResponse): void;
  clear(): void;
}

const storage = createMMKV({ id: 'noos.state.v1' });
const defaultSurveyValue = 0.5;

const zustandStorage: StateStorage = {
  getItem: (name) => storage.getString(name) ?? null,
  setItem: (name, value) => storage.set(name, value),
  removeItem: (name) => {
    storage.remove(name);
  },
};

const planetIds = new Set<string>(Object.keys(PLANETS));

export function normalizeSurveyValue(value: number | null | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return defaultSurveyValue;
  }

  return Math.min(1, Math.max(0, value));
}

export function normalizeSurveyDraft(survey: MeasureSurvey): SurveyDraft {
  return {
    focus: normalizeSurveyValue(survey.focus),
    stress: normalizeSurveyValue(survey.stress),
    fatigue: normalizeSurveyValue(survey.fatigue),
    relaxation: normalizeSurveyValue(survey.relaxation),
    intentText: survey.intentText?.trim() || null,
  };
}

export function normalizePlanetId(value: string | null | undefined): PlanetId {
  const normalized = value?.trim().toLowerCase();

  return normalized && planetIds.has(normalized) ? (normalized as PlanetId) : 'neptune';
}

const initialState = {
  surveyDraft: null,
  currentState: null,
  stateLabel: null,
  measurementId: null,
  recommendedPlanet: null,
  alternates: [],
  confidence: null,
  source: null,
  measuredAt: null,
  intentText: null,
};

export const useStateStore = create<StateStoreShape>()(
  persist(
    (set, get) => ({
      ...initialState,
      setSurveyDraft: (survey) => set({ surveyDraft: normalizeSurveyDraft(survey) }),
      setFromMeasure: (response) => {
        const surveyDraft = get().surveyDraft;

        set({
          currentState: response.currentState,
          stateLabel: response.stateLabel,
          measurementId: response.measurementId,
          recommendedPlanet: normalizePlanetId(response.recommendedPlanet),
          alternates: response.alternates.map(normalizePlanetId).slice(0, 3),
          confidence: response.confidence,
          source: response.source,
          measuredAt: response.measuredAt,
          intentText: surveyDraft?.intentText ?? null,
        });
      },
      clear: () => set(initialState),
    }),
    {
      name: 'noos.state.v1',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        currentState: state.currentState,
        stateLabel: state.stateLabel,
        measurementId: state.measurementId,
        recommendedPlanet: state.recommendedPlanet,
        alternates: state.alternates,
        confidence: state.confidence,
        source: state.source,
        measuredAt: state.measuredAt,
        intentText: state.intentText,
      }),
    },
  ),
);
