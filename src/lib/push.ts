/**
 * Web push subscription helpers.
 *
 * Scope: weekly "did you know" tips for signed-in users. Nothing here ever
 * asks for permission on its own — the UI card does, and only after an
 * explicit "yes" from the user.
 */
import { supabase } from '@/integrations/supabase/client';

const SCAN_COUNT_KEY = 'maseya_scan_success_count';
const DISMISS_KEY = 'maseya_push_prompt_dismissed_at';
const DISMISS_DAYS = 30;
const SCANS_BEFORE_ASK = 2;

export const isStandalonePwa = (): boolean => {
  if (typeof window === 'undefined') return false;
  const mm = window.matchMedia?.('(display-mode: standalone)').matches;
  const iosSA = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return !!mm || iosSA;
};

export const isIOSDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOS =
    navigator.platform === 'MacIntel' &&
    (navigator as unknown as { maxTouchPoints?: number }).maxTouchPoints! > 1;
  return iOSDevice || iPadOS;
};

/** Browser is capable of web push at all. */
export const pushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

/** iOS only delivers web push when the app runs from the home screen. */
export const pushPossibleHere = (): boolean => {
  if (!pushSupported()) return false;
  if (isIOSDevice() && !isStandalonePwa()) return false;
  return true;
};

export const permissionState = (): NotificationPermission | 'unsupported' => {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
};

/** Counts a successful scan; returns the new total. */
export const recordScanSuccess = (barcode: string): number => {
  try {
    const seenKey = `${SCAN_COUNT_KEY}_last`;
    if (localStorage.getItem(seenKey) === barcode) {
      return Number(localStorage.getItem(SCAN_COUNT_KEY) || '0');
    }
    localStorage.setItem(seenKey, barcode);
    const next = Number(localStorage.getItem(SCAN_COUNT_KEY) || '0') + 1;
    localStorage.setItem(SCAN_COUNT_KEY, String(next));
    return next;
  } catch {
    return 0;
  }
};

export const scanSuccessCount = (): number => {
  try {
    return Number(localStorage.getItem(SCAN_COUNT_KEY) || '0');
  } catch {
    return 0;
  }
};

export const dismissPrompt = (): void => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch { /* ignore */ }
};

const dismissedRecently = (): boolean => {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const then = Number(raw);
    if (!Number.isFinite(then)) return false;
    return Date.now() - then < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

/** Should the soft opt-in card render right now? */
export const shouldShowOptIn = (isAuthenticated: boolean): boolean => {
  if (!isAuthenticated) return false;
  if (!pushPossibleHere()) return false;
  if (Notification.permission !== 'default') return false;
  if (dismissedRecently()) return false;
  return scanSuccessCount() >= SCANS_BEFORE_ASK;
};

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer | null): string => {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

// Always ask the server: the public key must match the private key used when
// sending, and a stale build-time value would silently break delivery.
const getVapidKey = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-vapid-key');
    if (error) return null;
    return (data as { key?: string })?.key ?? null;
  } catch {
    return null;
  }
};

export type SubscribeResult = 'subscribed' | 'denied' | 'unsupported' | 'error';

/** Requests permission (only call after an explicit user "yes") and subscribes. */
export const subscribeToPush = async (userId: string): Promise<SubscribeResult> => {
  if (!pushPossibleHere()) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration = await navigator.serviceWorker.ready;
    const key = await getVapidKey();
    if (!key) return 'error';

    let sub = await registration.pushManager.getSubscription();
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key) as unknown as BufferSource,
      });
    }

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
        auth: arrayBufferToBase64(sub.getKey('auth')),
        enabled: true,
      },
      { onConflict: 'endpoint' },
    );
    if (error) return 'error';
    return 'subscribed';
  } catch (e) {
    console.debug('[push] subscribe failed', e);
    return 'error';
  }
};

/** Real unsubscribe: drops the browser subscription and the stored row. */
export const unsubscribeFromPush = async (userId: string): Promise<boolean> => {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
    }
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    return true;
  } catch (e) {
    console.debug('[push] unsubscribe failed', e);
    return false;
  }
};

/** True when this device currently has a stored, enabled subscription. */
export const hasActiveSubscription = async (userId: string): Promise<boolean> => {
  try {
    if (!pushSupported() || Notification.permission !== 'granted') return false;
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return false;
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', sub.endpoint)
      .maybeSingle();
    return !!data;
  } catch {
    return false;
  }
};
