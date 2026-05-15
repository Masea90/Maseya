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

const OWNER_EMAIL = 'oumanzou.asmae@gmail.com';

type LogEntry = { ts: string; text: string };

export default function AdminPage() {
  const { currentUser, isLoading } = useAuth();
  const [productCount, setProductCount] = useState<number | null>(null);
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

  useEffect(() => {
    if (currentUser?.email === OWNER_EMAIL) refreshCount();
  }, [currentUser?.email]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-primary/10 animate-pulse" />
      </div>
    );
  }

  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.email !== OWNER_EMAIL) return <Navigate to="/scan" replace />;

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
