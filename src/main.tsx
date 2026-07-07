import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent service worker from interfering in iframe/preview contexts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
} else if ('serviceWorker' in navigator) {
  // Production-only SW registration with aggressive update detection so
  // installed PWA users always get the latest version without manual cache
  // clearing or reinstalling.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      const checkForUpdate = () => reg.update().catch(() => {});

      // 1) Check immediately on load
      checkForUpdate();

      // 2) Check every 15 min while the app is open
      setInterval(checkForUpdate, 15 * 60 * 1000);

      // 3) Check whenever the user re-focuses the tab / returns to the app
      //    (critical for installed PWAs that stay open in the background)
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate();
      });
      window.addEventListener('online', checkForUpdate);

      const notify = (worker: ServiceWorker) => {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(
              new CustomEvent('maseya:update-available', { detail: { worker } })
            );
          }
        });
      };

      if (reg.waiting && navigator.serviceWorker.controller) {
        window.dispatchEvent(
          new CustomEvent('maseya:update-available', { detail: { worker: reg.waiting } })
        );
      }
      reg.addEventListener('updatefound', () => {
        if (reg.installing) notify(reg.installing);
      });
    }).catch((e) => console.warn('[sw] register failed', e));

    // Reload once the new SW takes control after skipWaiting
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    });
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
