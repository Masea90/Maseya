import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Clock, Leaf, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { remedies } from '@/lib/remedies';

const RemediesPage = () => {
  const { t } = useUser();
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = [
    { key: 'All', label: t('all') },
    { key: 'Skin', label: t('skinCategory') },
    { key: 'Hair', label: t('hairCategory') },
    { key: 'Nutrition', label: t('nutritionCategory') },
  ];

  const filteredRemedies = remedies.filter(
    remedy => activeCategory === 'All' || remedy.category === activeCategory
  );

  return (
    <AppLayout title={t('naturalRemedies')} showSearch>
      <div className="px-4 py-6 space-y-4 animate-fade-in">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => setActiveCategory(cat.key)} className={cn('px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all', activeCategory === cat.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80')}>{cat.label}</button>
          ))}
        </div>

        <div className="bg-maseya-sage/20 border border-maseya-sage/40 rounded-2xl p-4 flex items-center gap-3">
          <Leaf className="w-6 h-6 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">{t('allNaturalRemedies')}</p>
        </div>

        <div className="space-y-3">
          {filteredRemedies.map(remedy => (
            <Link key={remedy.id} to={`/remedy/${remedy.id}`} className="block bg-card rounded-2xl p-4 shadow-warm transition-all hover:shadow-warm-lg">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">{remedy.image}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-foreground">{t(remedy.titleKey)}</h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3 h-3" /><span>{t(remedy.timeKey)}</span><span>•</span>
                    <span>{categories.find(c => c.key === remedy.category)?.label || remedy.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {remedy.benefitKeys.map(bk => (
                      <span key={bk} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{t(bk)}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default RemediesPage;
