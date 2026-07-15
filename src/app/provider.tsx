import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider, type Persister } from '@tanstack/react-query-persist-client';
import { get, set, del } from 'idb-keyval';

// Initialize QueryClient with specified offline parameters
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

// Custom IndexedDB persister using idb-keyval to support caching size above localStorage limits
const idbPersister: Persister = {
  persistClient: async (client) => {
    await set('pet-friendly-ph-cache', client);
  },
  restoreClient: async () => {
    return await get('pet-friendly-ph-cache');
  },
  removeClient: async () => {
    await del('pet-friendly-ph-cache');
  },
};

interface AppProviderProps {
  children: React.ReactNode;
}

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
