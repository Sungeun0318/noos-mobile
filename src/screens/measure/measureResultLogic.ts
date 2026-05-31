import type { EegBands, MeasureSource } from '@/api/types';

export function shouldShowEegBands(source: MeasureSource | null, bands: EegBands | null) {
  return !!bands && (source === 'eeg' || source === 'hybrid');
}

