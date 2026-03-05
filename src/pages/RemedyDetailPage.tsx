import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Leaf, CheckCircle2 } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

const remedies = [
  {
    id: 1,
    title: 'Honey & Oatmeal Face Mask',
    category: 'Skin',
    time: '15 min',
    image: '🍯',
    ingredients: ['2 tbsp raw honey', '1 tbsp oatmeal (finely ground)', '1 tbsp plain yogurt'],
    benefits: ['Hydrating', 'Soothing', 'Anti-inflammatory'],
    description: 'A gentle mask that soothes irritated skin and provides deep hydration. Perfect for dry or sensitive skin types.',
    steps: [
      'Mix all ingredients in a small bowl until smooth.',
      'Cleanse your face and pat dry.',
      'Apply the mask evenly, avoiding the eye area.',
      'Leave on for 15 minutes.',
      'Rinse with lukewarm water and pat dry.',
      'Follow with your moisturizer.',
    ],
  },
  {
    id: 2,
    title: 'Rosemary Hair Oil Treatment',
    category: 'Hair',
    time: '30 min',
    image: '🌿',
    ingredients: ['5 drops rosemary essential oil', '2 tbsp coconut oil', '1 tbsp jojoba oil'],
    benefits: ['Growth', 'Strengthening', 'Shine'],
    description: 'Stimulates hair follicles and promotes healthy hair growth. Regular use can reduce hair thinning.',
    steps: [
      'Warm the coconut and jojoba oils gently (do not boil).',
      'Add rosemary essential oil and mix well.',
      'Section your hair and apply the oil blend to your scalp.',
      'Massage in circular motions for 5 minutes.',
      'Leave on for 30 minutes (or overnight for deep treatment).',
      'Wash out with your regular shampoo.',
    ],
  },
  {
    id: 3,
    title: 'Rice Water Hair Rinse',
    category: 'Hair',
    time: '20 min',
    image: '🍚',
    ingredients: ['½ cup uncooked rice', '2 cups water', 'Optional: 2-3 drops lavender oil'],
    benefits: ['Shine', 'Strength', 'Detangling'],
    description: 'Ancient Asian beauty secret for silky, strong hair. The amino acids in rice water coat and protect hair strands.',
    steps: [
      'Rinse the rice briefly to remove impurities.',
      'Soak rice in 2 cups of water for 30 minutes, swirling occasionally.',
      'Strain the water into a clean container.',
      'After shampooing, pour the rice water over your hair.',
      'Massage into your scalp and hair for 5 minutes.',
      'Rinse with cool water.',
    ],
  },
  {
    id: 4,
    title: 'Green Tea Toner',
    category: 'Skin',
    time: '10 min',
    image: '🍵',
    ingredients: ['1 green tea bag (or 1 tsp loose leaf)', '1 cup boiled water', '1 tsp aloe vera gel'],
    benefits: ['Antioxidant', 'Pore-refining', 'Brightening'],
    description: 'Antioxidant-rich toner that helps reduce inflammation and minimize the appearance of pores.',
    steps: [
      'Steep green tea in boiled water for 5-10 minutes.',
      'Let it cool completely.',
      'Mix in aloe vera gel.',
      'Pour into a clean spray bottle or jar.',
      'Apply to clean skin with a cotton pad or spritz directly.',
      'Store in the fridge for up to 1 week.',
    ],
  },
  {
    id: 5,
    title: 'Avocado Hair Mask',
    category: 'Hair',
    time: '25 min',
    image: '🥑',
    ingredients: ['1 ripe avocado', '2 tbsp olive oil', '1 tbsp honey'],
    benefits: ['Deep conditioning', 'Repair', 'Moisture'],
    description: 'Intensive treatment for dry, damaged hair. Avocado is rich in vitamins A, D, E and healthy fats.',
    steps: [
      'Mash the avocado until completely smooth.',
      'Mix in olive oil and honey until well combined.',
      'Apply to damp, detangled hair from mid-length to ends.',
      'Cover with a shower cap.',
      'Leave on for 20-25 minutes.',
      'Rinse thoroughly and shampoo as normal.',
    ],
  },
  {
    id: 6,
    title: 'Collagen Boosting Smoothie',
    category: 'Nutrition',
    time: '5 min',
    image: '🥤',
    ingredients: ['1 cup mixed berries', '1 orange (juiced)', '1 scoop collagen powder', '½ cup yogurt'],
    benefits: ['Skin elasticity', 'Anti-aging', 'Glow'],
    description: 'Delicious smoothie that supports collagen production from the inside out.',
    steps: [
      'Add all ingredients to a blender.',
      'Blend on high for 30-60 seconds until smooth.',
      'Pour into a glass and enjoy immediately.',
      'Best consumed in the morning for maximum absorption.',
    ],
  },
  {
    id: 7,
    title: 'Turmeric Golden Mask',
    category: 'Skin',
    time: '20 min',
    image: '✨',
    ingredients: ['½ tsp turmeric powder', '1 tbsp honey', '2 tbsp milk or yogurt'],
    benefits: ['Brightening', 'Anti-inflammatory', 'Even tone'],
    description: 'Traditional remedy for radiant, glowing skin. Turmeric has been used in Ayurvedic beauty for centuries.',
    steps: [
      'Mix turmeric, honey, and milk into a smooth paste.',
      'Cleanse your face and apply the mask evenly.',
      'Avoid the eye area and lips.',
      'Leave on for 15-20 minutes.',
      'Rinse with lukewarm water (the yellow tint fades quickly).',
      'Apply moisturizer afterward.',
    ],
  },
  {
    id: 8,
    title: 'Biotin-Rich Breakfast Bowl',
    category: 'Nutrition',
    time: '10 min',
    image: '🥣',
    ingredients: ['2 eggs', '¼ cup almonds', '½ sweet potato (cubed)', 'Spinach handful'],
    benefits: ['Hair growth', 'Nail strength', 'Energy'],
    description: 'Start your day with nutrients essential for healthy hair, skin, and nails.',
    steps: [
      'Roast or microwave sweet potato cubes until soft.',
      'Scramble eggs in a pan with a little olive oil.',
      'Arrange in a bowl with sweet potato, spinach, and almonds.',
      'Season with salt, pepper, and a squeeze of lemon.',
    ],
  },
];

const RemedyDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useUser();

  const remedy = remedies.find(r => r.id === Number(id));

  if (!remedy) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <p className="text-muted-foreground mb-4">Remedy not found</p>
        <button onClick={() => navigate('/remedies')} className="text-primary underline">
          Back to Remedies
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-lg mx-auto flex items-center h-14 px-4 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="font-display text-lg font-semibold truncate">{remedy.title}</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6 animate-fade-in">
        {/* Hero */}
        <div className="bg-card rounded-3xl p-6 shadow-warm text-center">
          <span className="text-6xl mb-4 block">{remedy.image}</span>
          <h2 className="font-display text-xl font-semibold">{remedy.title}</h2>
          <div className="flex items-center justify-center gap-4 mt-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {remedy.time}</span>
            <span className="flex items-center gap-1"><Leaf className="w-4 h-4" /> {remedy.category}</span>
          </div>
          <p className="text-muted-foreground text-sm mt-4">{remedy.description}</p>
        </div>

        {/* Benefits */}
        <div className="flex flex-wrap gap-2">
          {remedy.benefits.map(b => (
            <span key={b} className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full font-medium">
              {b}
            </span>
          ))}
        </div>

        {/* Ingredients */}
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold">{t('keyIngredients')}</h3>
          <div className="bg-card rounded-2xl p-4 shadow-warm space-y-2">
            {remedy.ingredients.map((ing, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Leaf className="w-4 h-4 text-primary flex-shrink-0" />
                <span>{ing}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3">
          <h3 className="font-display text-lg font-semibold">{t('steps')}</h3>
          <div className="space-y-3">
            {remedy.steps.map((step, i) => (
              <div key={i} className="flex gap-3 bg-card rounded-xl p-4 shadow-warm">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-primary">{i + 1}</span>
                </div>
                <p className="text-sm text-foreground leading-relaxed">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RemedyDetailPage;
