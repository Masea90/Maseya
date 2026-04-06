import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Leaf } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { remedies } from '@/lib/remedies';

const RemedyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useUser();

  const remedy = remedies.find(r => r.id === Number(id));

  if (!remedy) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">{t('remedyNotFound')}</p>
        <button onClick={() => navigate('/remedies')} className="text-primary underline">{t('backToRemedies')}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="w-full sm:max-w-lg sm:mx-auto flex items-center h-14 px-4 gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <h1 className="font-display text-lg font-semibold truncate">{t(remedy.titleKey)}</h1>
        </div>
      </header>

      <div className="w-full sm:max-w-lg sm:mx-auto px-4 py-6 space-y-6 animate-fade-in">
        <div className="bg-card rounded-3xl p-6 shadow-warm text-center">
          <span className="text-6xl mb-4 block">{remedy.image}</span>
          <h2 className="font-display text-xl font-semibold">{t(remedy.titleKey)}</h2>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {t(remedy.timeKey)}</span>
            <span className="flex items-center gap-1"><Leaf className="w-4 h-4" /> {remedy.category}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-4">{t(remedy.descriptionKey)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {remedy.benefitKeys.map(bk => (
            <span key={bk} className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full font-medium">{t(bk)}</span>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold">{t('keyIngredients')}</h3>
          <div className="bg-card rounded-2xl p-4 shadow-warm space-y-2">
            {remedy.ingredientKeys.map((ik, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Leaf className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{t(ik)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold">{t('steps')}</h3>
          <div className="space-y-3">
            {remedy.stepKeys.map((sk, i) => (
              <div key={i} className="flex gap-3 bg-card rounded-xl p-4 shadow-warm">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{t(sk)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemedyDetailPage;
