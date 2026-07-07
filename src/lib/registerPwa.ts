const APP_SW_URL = "/sw.js";

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

const dispatchUpdateAvailable = (worker: ServiceWorker) => {
  window.dispatchEvent(
    new CustomEvent("maseya:update-available", { detail: { worker } })
  );
};

const watchInstallingWorker = (worker: ServiceWorker) => {
  worker.addEventListener("statechange", () => {
    if (worker.state === "installed" && navigator.serviceWorker.controller) {
      dispatchUpdateAvailable(worker);
    }
  });
};

export const registerPwaServiceWorker = () => {
  if (!("serviceWorker" in navigator)) return;

  if (shouldDisableAppServiceWorker()) {
    unregisterAppServiceWorkers().catch(() => {});
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(APP_SW_URL, { scope: "/" })
      .then((registration) => {
        let reloaded = false;
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (reloaded) return;
          reloaded = true;
          window.location.reload();
        });

        const checkForUpdate = () => registration.update().catch(() => {});

        if (registration.waiting && navigator.serviceWorker.controller) {
          dispatchUpdateAvailable(registration.waiting);
        }

        if (registration.installing) {
          watchInstallingWorker(registration.installing);
        }

        registration.addEventListener("updatefound", () => {
          if (registration.installing) {
            watchInstallingWorker(registration.installing);
          }
        });

        checkForUpdate();
        window.setInterval(checkForUpdate, 15 * 60 * 1000);
        window.addEventListener("focus", checkForUpdate);
        window.addEventListener("online", checkForUpdate);
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") checkForUpdate();
        });
      })
      .catch((error) => console.warn("[pwa] service worker registration failed", error));
  });
};