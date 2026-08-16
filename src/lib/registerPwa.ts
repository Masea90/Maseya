import { registerSW } from "virtual:pwa-register";

const APP_SW_URL = "/sw.js";
const UPDATE_INTERVAL_MS = 45 * 60 * 1000;

const isInIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const isPreviewOrDevHost = () => {
  const host = window.location.hostname;
  return (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host === "lovableproject.com" ||
    host.endsWith(".lovableproject.com") ||
    host === "lovableproject-dev.com" ||
    host.endsWith(".lovableproject-dev.com") ||
    host === "beta.lovable.dev" ||
    host.endsWith(".beta.lovable.dev")
  );
};

const shouldDisableAppServiceWorker = () => {
  return (
    !import.meta.env.PROD ||
    isInIframe() ||
    isPreviewOrDevHost() ||
    new URLSearchParams(window.location.search).get("sw") === "off"
  );
};

const isAppServiceWorkerRegistration = (registration: ServiceWorkerRegistration) => {
  const workers = [registration.active, registration.waiting, registration.installing];
  return workers.some((worker) => {
    if (!worker?.scriptURL) return false;
    try {
      return new URL(worker.scriptURL).pathname === APP_SW_URL;
    } catch {
      return false;
    }
  });
};

const unregisterAppServiceWorkers = async () => {
  if (!("serviceWorker" in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter(isAppServiceWorkerRegistration)
      .map((registration) => registration.unregister())
  );
};

export const registerPwaServiceWorker = (onNeedRefresh: (update: () => Promise<void>) => void) => {
  if (!("serviceWorker" in navigator)) return;

  if (shouldDisableAppServiceWorker()) {
    unregisterAppServiceWorkers().catch(() => {});
    return;
  }

  let intervalId: number | undefined;

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      onNeedRefresh(() => updateSW(true));
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const checkForUpdate = () => registration.update().catch(() => {});
      checkForUpdate();
      intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
    },
    onRegisterError(error) {
      console.warn("[pwa] service worker registration failed", error);
    },
  });

  return () => {
    if (intervalId !== undefined) window.clearInterval(intervalId);
  };
};