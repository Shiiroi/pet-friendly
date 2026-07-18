import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider, type Persister } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

/**
 * QueryClient configured for offline-first operations.
 * - staleTime: 24 hours (data remains fresh for a day before requiring refresh).
 * - gcTime: 7 days (inactive cache items kept in database for a week).
 * - networkMode: 'offlineFirst' (enables offline queries/mutations).
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60 * 24, // 24 hours
      gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days
      networkMode: 'offlineFirst',
    },
    mutations: {
      networkMode: 'offlineFirst',
    },
  },
});

/**
 * Asynchronous query cache persister using IndexedDB to store cache
 * data exceeding localStorage's synchronous storage limits.
 */
const idbPersister: Persister = {
  persistClient: async (client) => {
    await set('compaws-cache', client);
  },
  restoreClient: async () => {
    return await get('compaws-cache');
  },
  removeClient: async () => {
    await del('compaws-cache');
  },
};

interface AppProviderProps {
  children: React.ReactNode;
}

/**
 * AppProvider wrapping TanStack Query with IndexedDB cache persistence.
 */
export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // Persist up to 7 days, matching gcTime
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};
