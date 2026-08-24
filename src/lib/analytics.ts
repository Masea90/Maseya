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

const SID_KEY = 'maseya_sid';
let memorySid: string | null = null;

const randomId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch { /* ignore */ }
  return `sid_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

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
  try {
    const session_id = getSessionId();
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const user_id = data.session?.user?.id ?? null;
        await supabase.from('app_events').insert({
          session_id,
          user_id,
          event,
          props: (props ?? null) as never,
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
