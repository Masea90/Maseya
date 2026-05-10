import { useEffect, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, LogOut } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDevMode, usePremium, setPremium } from '@/lib/premium';

interface HealthState {
  skin_type: string[];
  skin_conditions: string[];
  skin_sensitivities: string[];
  hair_type: string;
  hair_condition: string;
  hair_concerns: string[];
  allergies: string[];
  diet: string;
  nutrition_goals: string[];
  pregnancy_or_lactation: boolean;
}

const EMPTY: HealthState = {
  skin_type: [],
  skin_conditions: [],
  skin_sensitivities: [],
  hair_type: '',
  hair_condition: '',
  hair_concerns: [],
  allergies: [],
  diet: '',
  nutrition_goals: [],
  pregnancy_or_lactation: false,
};

const OPTIONS = {
  skin_type: ['atopic', 'dry', 'oily', 'normal'],
  skin_type_label: { atopic: 'Atópica', dry: 'Seca', oily: 'Grasa', normal: 'Normal/Mixta' } as Record<string, string>,
  skin_conditions: ['psoriasis', 'rosacea', 'acne'],
  skin_conditions_label: { psoriasis: 'Psoriasis', rosacea: 'Rosácea', acne: 'Acné' } as Record<string, string>,
  sensitivities: ['fragrance', 'alcohol', 'sulfate', 'paraben'],
  sensitivities_label: { fragrance: 'Perfumes', alcohol: 'Alcohol', sulfate: 'Sulfatos', paraben: 'Parabenos' } as Record<string, string>,
  hair_type: ['straight', 'wavy', 'curly', 'coily'],
  hair_type_label: { straight: 'Liso', wavy: 'Ondulado', curly: 'Rizado', coily: 'Muy rizado' } as Record<string, string>,
  hair_condition: ['dry', 'oily', 'normal', 'damaged'],
  hair_condition_label: { dry: 'Seco', oily: 'Graso', normal: 'Normal', damaged: 'Dañado' } as Record<string, string>,
  hair_concerns: ['hairloss', 'dandruff', 'frizz', 'colored'],
  hair_concerns_label: { hairloss: 'Caída', dandruff: 'Caspa', frizz: 'Frizz', colored: 'Color tratado' } as Record<string, string>,
  allergies: ['gluten', 'lactose', 'nuts', 'fish'],
  allergies_label: { gluten: 'Gluten', lactose: 'Lactosa', nuts: 'Frutos secos', fish: 'Pescado/marisco' } as Record<string, string>,
  diet: ['omnivore', 'vegetarian', 'vegan', 'keto', 'no-sugar'],
  diet_label: { omnivore: 'Omnívora', vegetarian: 'Vegetariana', vegan: 'Vegana', keto: 'Keto', 'no-sugar': 'Sin azúcar' } as Record<string, string>,
  nutrition_goals: ['lose-weight', 'gain-muscle', 'more-energy', 'healthy-skin'],
  nutrition_goals_label: { 'lose-weight': 'Perder peso', 'gain-muscle': 'Ganar músculo', 'more-energy': 'Más energía', 'healthy-skin': 'Piel más sana' } as Record<string, string>,
};

const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-3.5 py-2 rounded-full border text-sm transition-colors',
      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-muted'
    )}
  >
    {children}
  </button>
);

const Section = ({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) => (
  <Collapsible defaultOpen>
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <CollapsibleTrigger className="w-full p-4 flex items-center justify-between">
        <span className="font-semibold flex items-center gap-2">{emoji} {title}</span>
        <ChevronDown className="w-4 h-4" />
      </CollapsibleTrigger>
      <CollapsibleContent className="p-4 pt-0 space-y-4">{children}</CollapsibleContent>
    </div>
  </Collapsible>
);

const computePct = (s: HealthState): number => {
  let filled = 0;
  const total = 9;
  if (s.skin_type.length) filled++;
  if (s.skin_conditions.length) filled++;
  if (s.skin_sensitivities.length) filled++;
  if (s.hair_type) filled++;
  if (s.hair_condition) filled++;
  if (s.hair_concerns.length) filled++;
  if (s.allergies.length) filled++;
  if (s.diet) filled++;
  if (s.nutrition_goals.length) filled++;
  return Math.round((filled / total) * 100);
};

const ProfilePage = () => {
  const { user } = useUser();
  const { logout, currentUser } = useAuth();
  const [state, setState] = useState<HealthState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [productCount, setProductCount] = useState<number | null>(null);
  const devMode = useDevMode();
  const premium = usePremium();

  const refreshProductCount = async () => {
    const { count } = await supabase
      .from('maseya_products')
      .select('*', { count: 'exact', head: true });
    setProductCount(count ?? 0);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    supabase
      .from('health_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setState({
            skin_type: data.skin_type || [],
            skin_conditions: data.skin_conditions || [],
            skin_sensitivities: data.skin_sensitivities || [],
            hair_type: data.hair_type || '',
            hair_condition: data.hair_condition || '',
            hair_concerns: data.hair_concerns || [],
            allergies: data.allergies || [],
            diet: data.diet || '',
            nutrition_goals: data.nutrition_goals || [],
            pregnancy_or_lactation: data.pregnancy_or_lactation || false,
          });
        }
      });
  }, [currentUser?.id]);

  useEffect(() => {
    if (devMode) refreshProductCount();
  }, [devMode]);

  const pct = computePct(state);

  const toggleArr = (key: keyof HealthState, val: string) => {
    setState(prev => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val] };
    });
  };

  const setSingle = (key: keyof HealthState, val: string) => {
    setState(prev => ({ ...prev, [key]: prev[key] === val ? '' : val }));
  };

  const save = async () => {
    if (!currentUser?.id) return;
    setSaving(true);
    const { error } = await supabase
      .from('health_profiles')
      .upsert(
        { user_id: currentUser.id, ...state, completion_pct: pct },
        { onConflict: 'user_id' }
      );
    setSaving(false);
    if (error) toast.error('No se pudo guardar');
    else toast.success('Perfil actualizado');
  };

  return (
    <AppLayout title="Perfil">
      <div className="px-4 py-6 space-y-4">
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center font-semibold text-primary">
              {(user.nickname || user.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate flex items-center gap-2">
                {user.nickname || user.name}
                {premium && (
                  <span className="px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground text-[10px] font-bold tracking-wider">
                    Premium
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Completitud del perfil</span><span className="font-semibold text-foreground">{pct}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <Section title="Piel" emoji="🌸">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Tipo de piel</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.skin_type.map(o => (
                <Chip key={o} active={state.skin_type.includes(o)} onClick={() => toggleArr('skin_type', o)}>
                  {OPTIONS.skin_type_label[o]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Condiciones</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.skin_conditions.map(o => (
                <Chip key={o} active={state.skin_conditions.includes(o)} onClick={() => toggleArr('skin_conditions', o)}>
                  {OPTIONS.skin_conditions_label[o]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Sensibilidades</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.sensitivities.map(o => (
                <Chip key={o} active={state.skin_sensitivities.includes(o)} onClick={() => toggleArr('skin_sensitivities', o)}>
                  {OPTIONS.sensitivities_label[o]}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Cabello" emoji="💇">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Tipo</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.hair_type.map(o => (
                <Chip key={o} active={state.hair_type === o} onClick={() => setSingle('hair_type', o)}>
                  {OPTIONS.hair_type_label[o]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Condición</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.hair_condition.map(o => (
                <Chip key={o} active={state.hair_condition === o} onClick={() => setSingle('hair_condition', o)}>
                  {OPTIONS.hair_condition_label[o]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Concerns</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.hair_concerns.map(o => (
                <Chip key={o} active={state.hair_concerns.includes(o)} onClick={() => toggleArr('hair_concerns', o)}>
                  {OPTIONS.hair_concerns_label[o]}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Alimentación" emoji="🥗">
          <div>
            <p className="text-xs text-muted-foreground mb-2">Intolerancias</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.allergies.map(o => (
                <Chip key={o} active={state.allergies.includes(o)} onClick={() => toggleArr('allergies', o)}>
                  {OPTIONS.allergies_label[o]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Dieta</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.diet.map(o => (
                <Chip key={o} active={state.diet === o} onClick={() => setSingle('diet', o)}>
                  {OPTIONS.diet_label[o]}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Objetivos</p>
            <div className="flex flex-wrap gap-2">
              {OPTIONS.nutrition_goals.map(o => (
                <Chip key={o} active={state.nutrition_goals.includes(o)} onClick={() => toggleArr('nutrition_goals', o)}>
                  {OPTIONS.nutrition_goals_label[o]}
                </Chip>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Salud" emoji="🤰">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Embarazo o lactancia</p>
              <p className="text-xs text-muted-foreground">Afecta las recomendaciones</p>
            </div>
            <Switch
              checked={state.pregnancy_or_lactation}
              onCheckedChange={(v) => setState(prev => ({ ...prev, pregnancy_or_lactation: v }))}
            />
          </div>
        </Section>

        <Button onClick={save} disabled={saving} className="w-full h-12 rounded-2xl">
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>

        <Button
          onClick={() => setPremium(!premium)}
          variant="outline"
          className="w-full gap-2"
        >
          🧪 {premium ? 'Desactivar Premium (test)' : 'Activar Premium (test)'}
        </Button>

        <Button onClick={() => logout()} variant="outline" className="w-full gap-2">
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </Button>

        {devMode && (
          <div className="mt-6 p-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 space-y-3">
            <p className="text-xs font-semibold text-primary uppercase tracking-wider">Dev tools</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Modo Premium (test)</p>
                <p className="text-xs text-muted-foreground">Activa funciones Premium localmente</p>
              </div>
              <Switch checked={premium} onCheckedChange={(v) => setPremium(v)} />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                const tid = toast.loading('Enriqueciendo productos...');
                const { data, error } = await supabase.functions.invoke('enrich-products', { body: {} });
                toast.dismiss(tid);
                if (error) {
                  toast.error('Error al enriquecer productos');
                  return;
                }
                const r = data as { scanned?: number; enriched?: number; still_missing?: number };
                toast.success(`${r?.enriched ?? 0} productos actualizados (${r?.scanned ?? 0} escaneados)`);
              }}
            >
              🔄 Enriquecer productos ahora
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
