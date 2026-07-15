/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Precache all files built by Vite
precacheAndRoute((self as any).__WB_MANIFEST);

// Force immediate activation
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ============================================================================
// TODO: CacheFirst strategy for OSM tile requests (tile.openstreetmap.org)
// ============================================================================

// ============================================================================
// TODO: NetworkFirst strategy for Supabase REST calls, short cache timeout
// ============================================================================
