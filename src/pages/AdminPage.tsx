import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

type LogEntry = { ts: string; text: string };
type Stats = {
  total_users: number;
  total_scans: number;
  total_products: number;
  active_users_7d: number;
  scans_today: number;
  products_added_7d: number;
};
type RecentScan = {
  id: string;
  user_id: string;
  nickname: string | null;
  product_name: string | null;
  barcode: string;
  category: string | null;
  scanned_at: string;
};
type RecentProduct = {
  barcode: string;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  source: string | null;
  verified: boolean | null;
  submitted_by: string | null;
  created_at: string;
};
type ActiveUser = {
  user_id: string;
  nickname: string | null;
  last_scan_at: string;
  scan_count: number;
};

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString('es-ES');
};

export default function AdminPage() {
  const { currentUser, isLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([]);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [foodPage, setFoodPage] = useState(1);
  const [cosmoPage, setCosmoPage] = useState(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoBusy, setAutoBusy] = useState(false);
  const [autoStatus, setAutoStatus] = useState<string>('');
  const [autoProgress, setAutoProgress] = useState(0);
  const [autoTotalImported, setAutoTotalImported] = useState(0);

  const refreshCount = async () => {
    const { count } = await supabase
      .from('maseya_products')
      .select('*', { count: 'exact', head: true });
    setProductCount(count ?? 0);
  };

  const loadDashboard = async () => {
    const [s, sc, rp, au] = await Promise.all([
      supabase.rpc('admin_stats'),
      supabase.rpc('admin_recent_scans', { p_limit: 25 }),
      supabase.rpc('admin_recent_products', { p_limit: 25 }),
      supabase.rpc('admin_active_users', { p_limit: 25 }),
    ]);
    if (s.data && Array.isArray(s.data) && s.data[0]) setStats(s.data[0] as Stats);
    if (sc.data) setRecentScans(sc.data as RecentScan[]);
    if (rp.data) setRecentProducts(rp.data as RecentProduct[]);
    if (au.data) setActiveUsers(au.data as ActiveUser[]);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    (async () => {
      const { data } = await supabase.rpc('has_role', {
        _user_id: currentUser.id,
        _role: 'admin',
      });
      const admin = data === true;
      setIsAdmin(admin);
      if (admin) {
        refreshCount();
        loadDashboard();
      }
    })();
  }, [currentUser?.id]);

  if (isLoading || isAdmin === null) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 animate-pulse" />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/scan" replace />;


  const log = (text: string) =>
    setLogs((l) => [{ ts: new Date().toLocaleTimeString(), text }, ...l].slice(0, 50));

  const callFn = async (name: string, body: Record<string, unknown>, label: string) => {
    setBusy(label);
    log(`${label}: invocando…`);
    try {
      const { data, error } = await supabase.functions.invoke(name, { body });
      if (error) throw error;
      log(`${label}: ${JSON.stringify(data)}`);
      toast({ title: label, description: 'Completado' });
      await refreshCount();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      log(`${label}: ERROR ${msg}`);
      toast({ title: label, description: msg, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  const pageOptions = Array.from({ length: 10 }, (_, i) => i + 1);

  const runAutoImport = async () => {
    setAutoBusy(true);
    setAutoTotalImported(0);
    setAutoProgress(0);
    setAutoStatus('Iniciando importación…');
    log('Auto-import: iniciado');
    let totalImported = 0;
    const sources: Array<{ source: 'off' | 'obf'; label: string }> = [
      { source: 'off', label: 'alimentos' },
      { source: 'obf', label: 'cosméticos' },
    ];
    const totalSteps = sources.length * 10;
    let step = 0;
    try {
      for (const { source, label } of sources) {
        for (let page = 1; page <= 10; page++) {
          step++;
          setAutoStatus(`Importando ${label} página ${page}/10… (${totalImported} productos)`);
          try {
            const { data, error } = await supabase.functions.invoke('import-off-products', {
              body: { source, page },
            });
            if (error) throw error;
            const imported = Number((data as { imported?: number })?.imported ?? 0);
            totalImported += imported;
            setAutoTotalImported(totalImported);
            log(`Auto ${label} p${page}: +${imported} (total ${totalImported})`);
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            log(`Auto ${label} p${page}: ERROR ${msg}`);
          }
          setAutoProgress(Math.round((step / totalSteps) * 100));
        }
      }
      setAutoStatus(`✅ Importación completa: ${totalImported} productos en total`);
      toast({ title: 'Importación completa', description: `${totalImported} productos importados` });
      await refreshCount();
    } finally {
      setAutoBusy(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto w-full max-w-lg p-4 space-y-4">
        <header className="space-y-1">
          <h1 className="text-2xl font-serif">Admin</h1>
          <p className="text-sm text-muted-foreground">{currentUser.email}</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos en la base</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="text-3xl font-semibold">
              {productCount === null ? '—' : productCount.toLocaleString('es-ES')}
            </span>
            <Button variant="outline" size="sm" onClick={refreshCount}>
              Actualizar
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🚀 Importación automática</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Importa automáticamente las páginas 1–10 de alimentos y cosméticos de España.
            </p>
            <Button
              className="w-full"
              disabled={autoBusy || !!busy}
              onClick={runAutoImport}
            >
              {autoBusy ? 'Importando…' : '🚀 Importar todo automáticamente'}
            </Button>
            {(autoBusy || autoStatus) && (
              <div className="space-y-2">
                <Progress value={autoProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">{autoStatus}</p>
                {autoTotalImported > 0 && (
                  <p className="text-xs font-medium">
                    Total importados: {autoTotalImported.toLocaleString('es-ES')}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📥 Importar alimentos España</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Página</span>
              <Select value={String(foodPage)} onValueChange={(v) => setFoodPage(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pageOptions.map((p) => (
                    <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!!busy}
              onClick={() => callFn('import-off-products', { source: 'off', page: foodPage }, `Alimentos p${foodPage}`)}
            >
              {busy === `Alimentos p${foodPage}` ? 'Importando…' : 'Importar'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📥 Importar cosméticos España</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Página</span>
              <Select value={String(cosmoPage)} onValueChange={(v) => setCosmoPage(Number(v))}>
                <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pageOptions.map((p) => (
                    <SelectItem key={p} value={String(p)}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!!busy}
              onClick={() => callFn('import-off-products', { source: 'obf', page: cosmoPage }, `Cosméticos p${cosmoPage}`)}
            >
              {busy === `Cosméticos p${cosmoPage}` ? 'Importando…' : 'Importar'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔄 Enriquecer productos</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              variant="secondary"
              disabled={!!busy}
              onClick={() => callFn('enrich-products', {}, 'Enriquecer')}
            >
              {busy === 'Enriquecer' ? 'Procesando…' : 'Ejecutar'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin actividad todavía.</p>
            ) : (
              <ul className="space-y-2 text-xs font-mono max-h-72 overflow-auto">
                {logs.map((l, i) => (
                  <li key={i} className="border-b border-border pb-1">
                    <span className="text-muted-foreground">[{l.ts}]</span> {l.text}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
