import { useQuery } from '@tanstack/react-query';

import { noosApi } from '@/api/noosApi';
import { useSettingsStore } from '@/stores/settingsStore';

import { qk } from './keys';

export function useHealth() {
  const backendBaseUrl = useSettingsStore((state) => state.backendBaseUrl);

  return useQuery({
    queryKey: qk.health(),
    queryFn: () => noosApi.health(),
    staleTime: 30_000,
    retry: false,
    enabled: !!backendBaseUrl,
  });
}
