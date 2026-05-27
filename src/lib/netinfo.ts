export type NetworkStatus = 'unknown' | 'online' | 'offline';

export interface NetInfoSnapshot {
  status: NetworkStatus;
}

export function getCurrentNetInfo(): NetInfoSnapshot {
  return { status: 'unknown' };
}
