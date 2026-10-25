/**
 * Anonymous, GDPR-safe usage analytics.
 *
 * We never collect personal data: no IP, no user-agent, no location, no health
 * profile content. The only identifier is a RANDOM uuid stored in localStorage
 * that groups actions of one browser session/device — it does not identify a
 * person. `user_id` is attached only when a session already exists, so we can
 * separate registered from anonymous usage.
 *
 * Everything here is best-effort and completely silent on failure: analytics
 * must NEVER affect the UI.
 */
import { supabase } from '@/integrations/supabase/client';
import { getStoredConsent } from '@/components/consent/ConsentModal';

const SID_KEY = 'maseya_sid';
let memorySid: string | null = null;

const UTM_KEY = 'maseya_utm';
const UTM_FIELDS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

// Capture the landing URL before navigation, even while consent is undecided.
// This stays in the tab only; track() still sends nothing without consent.
try {
  if (sessionStorage.getItem(UTM_KEY) === null) {
    const params = new URLSearchParams(window.location.search);
    const attribution: Record<string, string> = {};
    for (const field of UTM_FIELDS) {
      const value = params.get(field);
      if (value) attribution[field] = value.slice(0, 100);
    }
    if (Object.keys(attribution).length > 0) {
      attribution.referrer = document.referrer;
      attribution.landing_path = window.location.pathname;
      sessionStorage.setItem(UTM_KEY, JSON.stringify(attribution));
    }
  }
} catch { /* storage blocked — attribution must never affect the app */ }

function sessionAttribution(): Record<string, string> {
  try {
    const stored = sessionStorage.getItem(UTM_KEY);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return {};
    const attribution: Record<string, string> = {};
    for (const field of [...UTM_FIELDS, 'referrer', 'landing_path']) {
      const value = (parsed as Record<string, unknown>)[field];
      if (typeof value === 'string') {
        attribution[field] = field.startsWith('utm_') ? value.slice(0, 100) : value;
      }
    }
    return attribution;
  } catch { return {}; }
}

const randomId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* ignore */ }
  return `sid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

/** AEPD: no measurement at all without an explicit opt-in. */
export function analyticsAllowed(): boolean {
  return getStoredConsent()?.analytics === true;
}

export function getSessionId(): string {
  try {
    const stored = localStorage.getItem(SID_KEY);
    if (stored) return stored;
    const fresh = memorySid ?? randomId();
    localStorage.setItem(SID_KEY, fresh);
    return fresh;
  } catch {
    // Private mode / storage blocked → keep one in memory for this page life.
    if (!memorySid) memorySid = randomId();
    return memorySid;
  }
}

export function track(event: string, props?: Record<string, unknown>): void {
  // No consent → no id is created and nothing is inserted.
  if (!analyticsAllowed()) return;
  try {
    const attribution = sessionAttribution();
    const eventProps = Object.keys(attribution).length > 0
      ? { ...attribution, ...props }
      : (props ?? null);
    const session_id = getSessionId();
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user_id = data.session?.user?.id ?? null;
        await supabase.from('app_events').insert({
          session_id,
          user_id,
          event,
          props: eventProps as never,
        });
      } catch (e) {
        console.debug('[analytics] insert skipped', e);
      }
    })();
  } catch (e) {
    console.debug('[analytics] track skipped', e);
  }
}


/** Current UI language, read defensively from storage (no personal data). */
export function currentLanguage(): string {
  try {
    return localStorage.getItem('maseya_language') || 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Fires 'app_open' at most once per browser tab session. */
export function trackAppOpen(): void {
  try {
    if (sessionStorage.getItem('maseya_app_open')) return;
    sessionStorage.setItem('maseya_app_open', '1');
  } catch { /* keep going — worst case we log one extra open */ }
  track('app_open', { language: currentLanguage() });
}
