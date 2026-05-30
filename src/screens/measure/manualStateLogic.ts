import type { MuseStatus } from '@/stores/deviceStore';

export function shouldUseMuseMeasure(status: MuseStatus) {
  return status === 'connected';
}
