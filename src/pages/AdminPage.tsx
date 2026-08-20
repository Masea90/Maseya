import { useCallback, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

type Pulse = {
  scans_today: number;
  scans_7d: number;
  scans_30d: number;
  active_users_7d: number;
  total_users: number;
  new_users_7d: number;
  photo_products_7d: number;
  total_products: number;
  pending_feedback: number;
};

type FeedbackRow = {
  id: string;
  created_at: string;
  type: string;
  rating: string | null;
  email: string | null;
  user_id: string | null;
  nickname: string | null;
  message: string | null;
  context: Record<string, unknown> | null;
  resolved_at: string | null;
  resolution: string | null;
};

type ActivityRow = {
  id: string;
  scanned_at: string;
  user_email: string | null;
  nickname: string | null;
  product_name: string | null;
  barcode: string | null;
  category: string | null;
  score: number | null;
};

type TopRow = { barcode: string; product_name: string | null; scans: number; users: number };

type CandidateRow = {
  id: string;
  ingredient_name: string;
  display_name: string | null;
  suggested_level: string;
  reason: string | null;
  confidence: number | null;
  category: string | null;
  occurrences: number;
  sample_barcodes: string[] | null;
  first_seen_at: string;
  last_seen_at: string;
  status: string;
  reviewed_at: string | null;
  reviewer_note: string | null;
};

const PAGE_SIZE = 20;

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const mins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString('es-ES');
};

function StatCard({ label, value, accent }: { label: string; value: number | undefined; accent?: boolean }) {
  return (
    <div className={`rounded-lg border border-border p-3 ${accent ? 'bg-primary/5' : 'bg-card'}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold mt-0.5">
        {value === undefined ? '—' : Number(value).toLocaleString('es-ES')}
      </p>
    </div>
  );
}

export default function AdminPage() {
  const { currentUser, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [counts, setCounts] = useState<{ pending: number; resolved: number } | null>(null);
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending');
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [top, setTop] = useState<TopRow[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [candTab, setCandTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [candCounts, setCandCounts] = useState<{ pending: number; approved: number; rejected: number } | null>(null);
  const [candNotes, setCandNotes] = useState<Record<string, string>>({});

  const loadCandidates = useCallback(async (status: 'pending' | 'approved' | 'rejected') => {
    const [list, counts] = await Promise.all([
      supabase.rpc('admin_candidates_list', { p_status: status, p_limit: 100 }),
      supabase.rpc('admin_candidates_counts'),
    ]);
    if (list.error) {
      toast({ title: 'Error al cargar candidatos', description: list.error.message, variant: 'destructive' });
    } else {
      setCandidates((list.data ?? []) as unknown as CandidateRow[]);
    }
    const c = Array.isArray(counts.data) ? (counts.data[0] as unknown as { pending: number; approved: number; rejected: number }) : null;
    if (c) setCandCounts({ pending: Number(c.pending), approved: Number(c.approved), rejected: Number(c.rejected) });
  }, []);

  const setCandidateStatus = async (id: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.rpc('admin_set_candidate_status', {
      p_id: id,
      p_status: status,
      p_note: candNotes[id]?.trim() || null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setCandidates((prev) => prev.filter((c) => c.id !== id));
    setCandNotes((n) => { const copy = { ...n }; delete copy[id]; return copy; });
    toast({
      title: status === 'approved' ? 'Aprobado' : 'Descartado',
      description: status === 'approved'
        ? 'Aprobado. Añádelo a las listas de riesgo en el próximo despliegue con su fuente.'
        : 'No volverá a proponerse.',
    });
    await loadCandidates(candTab);
  };

  const loadFeedback = useCallback(async (pending: boolean, offset: number) => {
    const { data, error } = await supabase.rpc('admin_feedback_list', {
      p_pending: pending,
      p_limit: PAGE_SIZE,
      p_offset: offset,
    });
    if (error) {
      toast({ title: 'Error al cargar feedback', description: error.message, variant: 'destructive' });
      return;
    }
    const rows = (data ?? []) as unknown as FeedbackRow[];
    setItems((prev) => (offset === 0 ? rows : [...prev, ...rows]));
    setHasMore(rows.length === PAGE_SIZE);
  }, []);

  const loadCounts = useCallback(async () => {
    const { data } = await supabase.rpc('admin_feedback_counts');
    const row = Array.isArray(data) ? (data[0] as unknown as { pending: number; resolved: number }) : null;
    if (row) setCounts({ pending: Number(row.pending), resolved: Number(row.resolved) });
  }, []);

  const loadAll = useCallback(async () => {
    const [p, a, t] = await Promise.all([
      supabase.rpc('admin_pulse'),
      supabase.rpc('admin_activity_feed', { p_limit: 30 }),
      supabase.rpc('admin_top_scanned', { p_limit: 10 }),
    ]);
    if (Array.isArray(p.data) && p.data[0]) setPulse(p.data[0] as unknown as Pulse);
    if (a.data) setActivity(a.data as unknown as ActivityRow[]);
    if (t.data) setTop(t.data as unknown as TopRow[]);
    await Promise.all([loadCounts(), loadFeedback(tab === 'pending', 0), loadCandidates(candTab)]);
  }, [loadCounts, loadFeedback, tab, loadCandidates, candTab]);

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      const { data } = await supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'admin' });
      const admin = data === true;
      setIsAdmin(admin);
      if (admin) await loadAll();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const switchTab = async (next: 'pending' | 'resolved') => {
    setTab(next);
    setItems([]);
    await loadFeedback(next === 'pending', 0);
  };

  const setResolved = async (id: string, resolved: boolean) => {
    const note = notes[id]?.trim();
    if (resolved && !note) {
      toast({ title: 'Falta la nota', description: 'Escribe brevemente qué se hizo.', variant: 'destructive' });
      return;
    }
    const { error } = await supabase.rpc('admin_set_feedback_resolved', {
      p_id: id,
      p_resolved: resolved,
      p_note: note ?? null,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNotes((n) => { const c = { ...n }; delete c[id]; return c; });
    setItems((prev) => prev.filter((f) => f.id !== id));
    await loadCounts();
  };

  const callFn = async (name: string, body: Record<string, unknown>, label: string) => {
    setBusy(label);
    try {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      setLogs((l) => [`${new Date().toLocaleTimeString()} · ${label}: ${JSON.stringify(data)}`, ...l].slice(0, 30));
      toast({ title: label, description: 'Completado' });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLogs((l) => [`${new Date().toLocaleTimeString()} · ${label}: ERROR ${msg}`, ...l].slice(0, 30));
      toast({ title: label, description: msg, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  if (isLoading || isAdmin === null) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 animate-pulse" />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;

  if (!isAdmin) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6">
        <Card className="max-w-sm w-full">
          <CardHeader><CardTitle className="text-base">Acceso no autorizado</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">Esta sección es solo para administradoras.</p>
            <Button className="w-full" onClick={() => { window.location.href = '/scan'; }}>Volver a escanear</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-lg p-4 space-y-4 pt-safe pb-safe">
        <header className="flex items-baseline justify-between gap-2">
          <div>
            <h1 className="text-2xl font-serif">Admin</h1>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadAll}>🔄 Refrescar</Button>
        </header>

        {/* Pulso */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Escaneos hoy" value={pulse?.scans_today} accent />
          <StatCard label="Escaneos 7d" value={pulse?.scans_7d} accent />
          <StatCard label="Escaneos 30d" value={pulse?.scans_30d} />
          <StatCard label="Usuarias activas 7d" value={pulse?.active_users_7d} />
          <StatCard label="Registradas" value={pulse?.total_users} />
          <StatCard label="Nuevas 7d" value={pulse?.new_users_7d} />
          <StatCard label="Productos por foto 7d" value={pulse?.photo_products_7d} />
          <StatCard label="Productos en BD" value={pulse?.total_products} />
          <StatCard label="Feedback pendiente" value={pulse?.pending_feedback} accent />
          <StatCard label="Candidatos pendientes" value={candCounts?.pending} accent />
        </div>

        {/* Feedback */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">💬 Bandeja de feedback</CardTitle>
            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                variant={tab === 'pending' ? 'default' : 'outline'}
                onClick={() => switchTab('pending')}
              >
                Pendientes ({counts?.pending ?? '—'})
              </Button>
              <Button
                size="sm"
                variant={tab === 'resolved' ? 'default' : 'outline'}
                onClick={() => switchTab('resolved')}
              >
                Resueltos ({counts?.resolved ?? '—'})
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada por aquí.</p>
            ) : (
              <ul className="space-y-3">
                {items.map((f) => {
                  const ctx = (f.context || {}) as {
                    barcode?: string; product_name?: string; route?: string;
                    score_general?: number; score_personal?: number;
                  };
                  return (
                    <li key={f.id} className="border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs text-muted-foreground truncate">
                          {f.nickname || f.email || (f.user_id ? f.user_id.slice(0, 8) : 'anónimo')} · {fmtTime(f.created_at)}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted shrink-0">
                          {f.type}{f.rating ? ` · ${f.rating}` : ''}
                        </span>
                      </div>
                      {(ctx.product_name || ctx.barcode) && (
                        <div className="text-xs bg-primary/5 rounded px-2 py-1">
                          <p className="font-medium truncate">📦 {ctx.product_name || ctx.barcode}</p>
                          {ctx.barcode && ctx.product_name && (
                            <p className="text-[10px] font-mono text-muted-foreground">{ctx.barcode}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground">
                            General {ctx.score_general ?? '—'} · Personal {ctx.score_personal ?? '—'}
                            {ctx.route ? ` · ${ctx.route}` : ''}
                          </p>
                        </div>
                      )}
                      {f.message && <p className="text-sm whitespace-pre-wrap">{f.message}</p>}
                      {f.resolved_at ? (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">
                            ✅ Resuelto {fmtTime(f.resolved_at)}{f.resolution ? ` · ${f.resolution}` : ''}
                          </p>
                          <Button size="sm" variant="outline" onClick={() => setResolved(f.id, false)}>
                            Reabrir
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Textarea
                            rows={2}
                            placeholder="Nota breve: qué se hizo / qué falló…"
                            value={notes[f.id] || ''}
                            onChange={(e) => setNotes((n) => ({ ...n, [f.id]: e.target.value }))}
                            className="text-xs rounded-lg"
                          />
                          <Button size="sm" onClick={() => setResolved(f.id, true)}>
                            Marcar como resuelto
                          </Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {hasMore && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => loadFeedback(tab === 'pending', items.length)}
              >
                Cargar más
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Candidatos a revisar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">🧪 Candidatos a revisar</CardTitle>
            <p className="text-xs text-muted-foreground">
              La IA propone, tú decides. Aprobar no cambia el motor: la incorporación se hace a mano con su fuente.
            </p>
            <div className="flex gap-2 pt-2">
              {(['pending', 'approved', 'rejected'] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={candTab === s ? 'default' : 'outline'}
                  onClick={() => { setCandTab(s); loadCandidates(s); }}
                >
                  {s === 'pending' ? 'Pendientes' : s === 'approved' ? 'Aprobados' : 'Descartados'} (
                  {candCounts ? candCounts[s] : '—'})
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada por aquí.</p>
            ) : (
              <ul className="space-y-3">
                {candidates.map((c) => (
                  <li key={c.id} className="border border-border rounded-lg p-3 space-y-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm font-medium truncate">{c.display_name || c.ingredient_name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${c.suggested_level === 'avoid' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
                        {c.suggested_level === 'avoid' ? 'evitar' : 'precaución'}
                      </span>
                    </div>
                    {c.reason && <p className="text-xs text-muted-foreground">{c.reason}</p>}
                    <p className="text-[10px] text-muted-foreground">
                      {c.category || '—'} · {c.occurrences} aparici{c.occurrences === 1 ? 'ón' : 'ones'} ·
                      confianza {c.confidence != null ? `${Math.round(Number(c.confidence) * 100)}%` : '—'} ·
                      1.ª {fmtTime(c.first_seen_at)} · últ. {fmtTime(c.last_seen_at)}
                    </p>
                    {(c.sample_barcodes || []).length > 0 && (
                      <p className="text-[10px] font-mono space-x-2">
                        {(c.sample_barcodes || []).map((b) => (
                          <a key={b} href={`/result/${b}`} className="underline text-primary">{b}</a>
                        ))}
                      </p>
                    )}
                    {c.status === 'pending' ? (
                      <div className="space-y-2">
                        <Textarea
                          rows={2}
                          placeholder="Nota (fuente, criterio…)"
                          value={candNotes[c.id] || ''}
                          onChange={(e) => setCandNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                          className="text-xs rounded-lg"
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => setCandidateStatus(c.id, 'approved')}>Aprobar</Button>
                          <Button size="sm" variant="outline" onClick={() => setCandidateStatus(c.id, 'rejected')}>Descartar</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        {c.status === 'approved' ? '✅ Aprobado' : '🚫 Descartado'}
                        {c.reviewed_at ? ` · ${fmtTime(c.reviewed_at)}` : ''}
                        {c.reviewer_note ? ` · ${c.reviewer_note}` : ''}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardHeader><CardTitle className="text-base">📈 Actividad reciente</CardTitle></CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin escaneos todavía.</p>
            ) : (
              <ul className="space-y-2 max-h-96 overflow-auto">
                {activity.map((a) => (
                  <li key={a.id} className="text-xs border-b border-border pb-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="truncate font-medium">{a.product_name || a.barcode || '—'}</span>
                      <span className="shrink-0 text-muted-foreground">{a.score ?? '—'}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {a.user_email || 'anónimo'} · {a.category || 'sin categoría'} · {fmtTime(a.scanned_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Top productos */}
        <Card>
          <CardHeader><CardTitle className="text-base">🏆 Productos más escaneados</CardTitle></CardHeader>
          <CardContent>
            {top.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos.</p>
            ) : (
              <ol className="space-y-1.5">
                {top.map((t, i) => (
                  <li key={t.barcode} className="text-xs flex justify-between gap-2">
                    <span className="truncate">{i + 1}. {t.product_name || t.barcode}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {Number(t.scans)} · {Number(t.users)} 👤
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        {/* Herramientas */}
        <Card>
          <CardHeader><CardTitle className="text-base">🛠️ Herramientas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button
              className="w-full"
              variant="secondary"
              disabled={!!busy}
              onClick={() => callFn('import-off-products', { source: 'off', page: 1 }, 'Importar alimentos')}
            >
              {busy === 'Importar alimentos' ? 'Importando…' : '📥 Importar alimentos (p1)'}
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              disabled={!!busy}
              onClick={() => callFn('import-off-products', { source: 'obf', page: 1 }, 'Importar cosméticos')}
            >
              {busy === 'Importar cosméticos' ? 'Importando…' : '📥 Importar cosméticos (p1)'}
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              disabled={!!busy}
              onClick={() => callFn('enrich-products', {}, 'Enriquecer')}
            >
              {busy === 'Enriquecer' ? 'Procesando…' : '🔄 Enriquecer productos'}
            </Button>
            {logs.length > 0 && (
              <ul className="space-y-1 text-[10px] font-mono max-h-40 overflow-auto pt-2">
                {logs.map((l, i) => <li key={i} className="text-muted-foreground">{l}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
