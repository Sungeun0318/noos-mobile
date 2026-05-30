import NetInfo from '@react-native-community/netinfo';
import { useSyncExternalStore } from 'react';

import { logger } from '@/lib/logger';

export type NetworkStatus = 'unknown' | 'online' | 'offline';

export interface NetInfoSnapshot {
  status: NetworkStatus;
  offlineSince: number | null;
}

const log = logger.create('netinfo');
let unsubscribe: (() => void) | null = null;
let snapshot: NetInfoSnapshot = { offlineSince: null, status: 'unknown' };
const listeners = new Set<() => void>();

function emit(nextStatus: NetworkStatus, now = Date.now()) {
  const offlineSince =
    nextStatus === 'offline'
      ? snapshot.status === 'offline'
        ? snapshot.offlineSince
        : now
      : null;
  snapshot = { offlineSince, status: nextStatus };
  listeners.forEach((listener) => listener());
}

function toNetworkStatus(isConnected: boolean | null): NetworkStatus {
  if (isConnected === null) {
    return 'unknown';
  }

  return isConnected ? 'online' : 'offline';
}

export function getCurrentNetInfo(): NetInfoSnapshot {
  return snapshot;
}

export function subscribeNetInfo() {
  if (unsubscribe) {
    return unsubscribe;
  }

  unsubscribe = NetInfo.addEventListener((state) => {
    const status = toNetworkStatus(state.isConnected);
    emit(status);
    log.debug('network status changed', {
      status,
    });
  });

  return unsubscribe;
}

export function unsubscribeNetInfo() {
  unsubscribe?.();
  unsubscribe = null;
}

export function subscribeNetworkStatus(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function useNetworkStatus() {
  return useSyncExternalStore(subscribeNetworkStatus, getCurrentNetInfo, getCurrentNetInfo);
}

export function shouldShowOfflineBanner(
  status: NetworkStatus,
  offlineSince: number | null,
  now: number,
  graceMs = 5000,
) {
  return status === 'offline' && offlineSince !== null && now - offlineSince >= graceMs;
}

export function __setNetworkStatusForTests(status: NetworkStatus, now = Date.now()) {
  emit(status, now);
}
