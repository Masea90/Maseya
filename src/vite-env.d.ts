/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string;

/**
 * Minimal Push API augmentation.
 * The DOM lib includes PushManager, PushSubscription, etc. but some TS
 * versions omit pushManager from ServiceWorkerRegistration. This adds
 * only the missing property.
 */
interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}
