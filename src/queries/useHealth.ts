import { useQuery } from '@tanstack/react-query';

import { noosApi } from '@/api/noosApi';
import { useSettingsStore } from '@/stores/settingsStore';

import { qk } from './keys';

export function useHealth(options: { refetchInterval?: number } = {}) {
  const backendBaseUrl = useSettingsStore((state) => state.backendBaseUrl);

  return useQuery({
    queryKey: qk.health(),
    queryFn: () => noosApi.health(),
    staleTime: 30_000,
    refetchInterval: options.refetchInterval,
    retry: false,
    enabled: !!backendBaseUrl,
  });
}
