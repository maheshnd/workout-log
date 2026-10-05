import type { Workbox } from "workbox-window";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let wb: Workbox | null = null;

/** Register the service worker (production only). `onWaiting` fires when a new version is ready. */
export async function registerServiceWorker(onWaiting: () => void): Promise<void> {
  if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
  const { Workbox } = await import("workbox-window");
  wb = new Workbox(`${BASE}/sw.js`, { scope: `${BASE}/` });
  wb.addEventListener("waiting", onWaiting);
  wb.register().catch(() => {});
}

/** Activate the waiting service worker, then reload once it controls the page. Only on user tap. */
export function applyUpdate(): void {
  if (!wb) return location.reload();
  wb.addEventListener("controlling", () => location.reload());
  wb.messageSkipWaiting();
}

// ---------- Screen Wake Lock ----------

type Sentinel = { release: () => Promise<void> };
type WakeLockNav = Navigator & { wakeLock?: { request: (t: "screen") => Promise<Sentinel> } };

/** Keep the screen awake until the returned cleanup runs. Silently no-ops if unsupported. */
export function keepAwake(): () => void {
  const nav = navigator as WakeLockNav;
  if (!nav.wakeLock) return () => {};
  let sentinel: Sentinel | null = null;
  let active = true;

  const acquire = async () => {
    if (!active || document.visibilityState !== "visible") return;
    try {
      sentinel = await nav.wakeLock!.request("screen");
      if (!active) sentinel.release().catch(() => {});
    } catch {
      /* skip silently */
    }
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") acquire();
  };

  acquire();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    active = false;
    document.removeEventListener("visibilitychange", onVisible);
    sentinel?.release().catch(() => {});
    sentinel = null;
  };
}

// ---------- Persistent storage ----------

let persistAsked = false;

/** Ask the browser not to evict our data. Silent. */
export function requestPersist(): void {
  if (persistAsked) return;
  persistAsked = true;
  navigator.storage?.persist?.().catch(() => {});
}

// ---------- Install / platform ----------

export function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export type InstallPromptEvent = Event & { prompt: () => Promise<void> };
