/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
// Precache the whole static export so the app works in airplane mode.
precacheAndRoute(self.__WB_MANIFEST);
// Any navigation falls back to the precached app shell.
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

// Only activate a new version when the user taps "Update".
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});
