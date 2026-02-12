/// <reference types="vite/client" />

// Push API type augmentation — lib.dom doesn't include Push API by default
interface PushSubscriptionOptionsInit {
  userVisibleOnly?: boolean;
  applicationServerKey?: BufferSource | string | null;
}

interface PushSubscription {
  readonly endpoint: string;
  readonly options: PushSubscriptionOptionsInit;
  readonly expirationTime: DOMHighResTimeStamp | null;
  getKey(name: PushEncryptionKeyName): ArrayBuffer | null;
  toJSON(): PushSubscriptionJSON;
  unsubscribe(): Promise<boolean>;
}

interface PushSubscriptionJSON {
  endpoint?: string;
  expirationTime?: DOMHighResTimeStamp | null;
  keys?: Record<string, string>;
}

type PushEncryptionKeyName = 'p256dh' | 'auth';

interface PushManager {
  getSubscription(): Promise<PushSubscription | null>;
  permissionState(options?: PushSubscriptionOptionsInit): Promise<PushPermissionState>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
}

type PushPermissionState = 'denied' | 'granted' | 'prompt';

interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}
