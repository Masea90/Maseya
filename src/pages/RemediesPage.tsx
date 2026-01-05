import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Clock, Leaf, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

const remedies = [
  {
    id: 1,
    title: 'Honey & Oatmeal Face Mask',
    category: 'Skin',
    time: '15 min',
    image: '🍯',
    ingredients: ['Honey', 'Oatmeal', 'Yogurt'],
    benefits: ['Hydrating', 'Soothing', 'Anti-inflammatory'],
    description: 'A gentle mask that soothes irritated skin and provides deep hydration.',
  },
  {
    id: 2,
    title: 'Rosemary Hair Oil Treatment',
    category: 'Hair',
    time: '30 min',
    image: '🌿',
    ingredients: ['Rosemary oil', 'Coconut oil', 'Jojoba oil'],
    benefits: ['Growth', 'Strengthening', 'Shine'],
    description: 'Stimulates hair follicles and promotes healthy hair growth.',
  },
  {
    id: 3,
    title: 'Rice Water Hair Rinse',
    category: 'Hair',
    time: '20 min',
    image: '🍚',
    ingredients: ['Rice', 'Water', 'Optional: essential oils'],
    benefits: ['Shine', 'Strength', 'Detangling'],
    description: 'Ancient Asian beauty secret for silky, strong hair.',
  },
  {
    id: 4,
    title: 'Green Tea Toner',
    category: 'Skin',
    time: '10 min',
    image: '🍵',
    ingredients: ['Green tea', 'Aloe vera', 'Vitamin E'],
    benefits: ['Antioxidant', 'Pore-refining', 'Brightening'],
    description: 'Antioxidant-rich toner that helps reduce inflammation.',
  },
  {
    id: 5,
    title: 'Avocado Hair Mask',
    category: 'Hair',
    time: '25 min',
    image: '🥑',
    ingredients: ['Avocado', 'Olive oil', 'Honey'],
    benefits: ['Deep conditioning', 'Repair', 'Moisture'],
    description: 'Intensive treatment for dry, damaged hair.',
  },
  {
    id: 6,
    title: 'Collagen Boosting Smoothie',
    category: 'Nutrition',
    time: '5 min',
    image: '🥤',
    ingredients: ['Berries', 'Vitamin C', 'Collagen powder'],
    benefits: ['Skin elasticity', 'Anti-aging', 'Glow'],
    description: 'Delicious smoothie that supports collagen production.',
  },
  {
    id: 7,
    title: 'Turmeric Golden Mask',
    category: 'Skin',
    time: '20 min',
    image: '✨',
    ingredients: ['Turmeric', 'Honey', 'Milk'],
    benefits: ['Brightening', 'Anti-inflammatory', 'Even tone'],
    description: 'Traditional remedy for radiant, glowing skin.',
  },
  {
    id: 8,
    title: 'Biotin-Rich Breakfast Bowl',
    category: 'Nutrition',
    time: '10 min',
    image: '🥣',
    ingredients: ['Eggs', 'Almonds', 'Sweet potato'],
    benefits: ['Hair growth', 'Nail strength', 'Energy'],
    description: 'Start your day with nutrients for healthy hair and nails.',
  },
];

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
        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Info Banner */}
        <div className="bg-maseya-sage/20 border border-maseya-sage/40 rounded-2xl p-4 flex items-center gap-3">
          <Leaf className="w-6 h-6 text-primary flex-shrink-0" />
          <p className="text-sm text-foreground">
            {t('allNaturalRemedies')}
          </p>
        </div>

        {/* Remedies List */}
        <div className="space-y-3">
          {filteredRemedies.map(remedy => (
            <Link
              key={remedy.id}
              to={`/remedy/${remedy.id}`}
              className="block bg-card rounded-2xl p-4 shadow-warm transition-all hover:shadow-warm-lg"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
                  {remedy.image}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-foreground">{remedy.title}</h3>
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Clock className="w-3 h-3" />
                    <span>{remedy.time}</span>
                    <span>•</span>
                    <span>{categories.find(c => c.key === remedy.category)?.label || remedy.category}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {remedy.benefits.map(benefit => (
                      <span
                        key={benefit}
                        className="text-[10px] px-2 py-0.5 bg-glow-hair/10 text-glow-hair rounded-full"
                      >
                        {benefit}
                      </span>
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
