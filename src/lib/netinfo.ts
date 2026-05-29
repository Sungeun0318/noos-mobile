import NetInfo from '@react-native-community/netinfo';

import { logger } from '@/lib/logger';

export type NetworkStatus = 'unknown' | 'online' | 'offline';

export interface NetInfoSnapshot {
  status: NetworkStatus;
}

const log = logger.create('netinfo');
let unsubscribe: (() => void) | null = null;

export function getCurrentNetInfo(): NetInfoSnapshot {
  return { status: 'unknown' };
}

export function subscribeNetInfo() {
  if (unsubscribe) {
    return unsubscribe;
  }

  unsubscribe = NetInfo.addEventListener((state) => {
    log.debug('network status changed', {
      status: state.isConnected === null ? 'unknown' : state.isConnected ? 'online' : 'offline',
    });
  });

  return unsubscribe;
}

export function unsubscribeNetInfo() {
  unsubscribe?.();
  unsubscribe = null;
}
