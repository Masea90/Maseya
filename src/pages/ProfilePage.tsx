import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';

const COPY = {
  es: { title: 'Perfil', signOut: 'Cerrar sesión', healthProfile: 'Tu perfil de salud', edit: 'Completar perfil', completion: 'Completitud del perfil' },
  en: { title: 'Profile', signOut: 'Sign out', healthProfile: 'Your health profile', edit: 'Complete profile', completion: 'Profile completion' },
  fr: { title: 'Profil', signOut: 'Se déconnecter', healthProfile: 'Ton profil santé', edit: 'Compléter le profil', completion: 'Complétion du profil' },
};

const ProfilePage = () => {
  const { user } = useUser();
  const { logout, currentUser } = useAuth();
  const c = COPY[user.language] ?? COPY.es;

  return (
    <AppLayout title={c.title}>
      <div className="px-4 py-6 space-y-6">
        <div className="bg-card rounded-2xl p-6 border border-border flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center">
            <UserIcon className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{user.nickname || user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{currentUser?.email}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl p-5 border border-border">
          <h2 className="font-semibold mb-1">{c.healthProfile}</h2>
          <p className="text-xs text-muted-foreground mb-4">{c.completion}: 0%</p>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
            <div className="h-full bg-primary" style={{ width: '0%' }} />
          </div>
          <Button className="w-full" disabled>{c.edit}</Button>
        </div>

        <Button onClick={() => logout()} variant="outline" className="w-full gap-2">
          <LogOut className="w-4 h-4" /> {c.signOut}
        </Button>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
