import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Beta API — local typed wrapper.
interface OAuthApi {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: { client?: { name?: string; logo_uri?: string }; scopes?: string[]; redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{ data: { redirect_url?: string; redirect_to?: string } | null; error: { message: string } | null }>;
}
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get('authorization_id') ?? '';
  const [details, setDetails] = useState<Awaited<ReturnType<OAuthApi['getAuthorizationDetails']>>['data'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError('Falta authorization_id');
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = '/login?next=' + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError('No redirect returned by the authorization server.');
      return;
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
        <div className="max-w-md text-center space-y-3">
          <h1 className="font-display text-xl font-bold">No se pudo cargar la autorización</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? 'la aplicación';

  return (
    <main className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <span className="text-3xl">🌿</span>
        </div>
        <div className="space-y-2">
          <h1 className="font-display text-2xl font-bold">
            Conectar {clientName} a tu cuenta MASEYA
          </h1>
          <p className="text-sm text-muted-foreground">
            {clientName} podrá usar las herramientas de MASEYA en tu nombre (buscar productos y leer tu historial de escaneos).
          </p>
        </div>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            className="w-full h-12 rounded-2xl bg-gradient-olive"
            disabled={busy}
            onClick={() => decide(true)}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aprobar'}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 rounded-2xl"
            disabled={busy}
            onClick={() => decide(false)}
          >
            Denegar
          </Button>
        </div>
      </div>
    </main>
  );
}
