import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './client';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      retry: (failureCount, error) => {
        if (failureCount >= 2) {
          return false;
        }

        if (error instanceof ApiError) {
          return error.status >= 500 || error.status === 0;
        }

        return true;
      },
      staleTime: 30_000,
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});
