import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, ExternalLink, Users, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const mockProductDetails: Record<number, any> = {
  1: {
    name: 'Gentle Hydrating Cleanser',
    brand: 'CeraVe',
    match: 94,
    image: '🧴',
    price: '$15.99',
    description: 'A gentle, non-foaming cleanser that helps restore the protective skin barrier with three essential ceramides.',
    ingredients: [
      { name: 'Ceramides', safe: true, note: 'Essential for skin barrier' },
      { name: 'Hyaluronic Acid', safe: true, note: 'Intense hydration' },
      { name: 'Glycerin', safe: true, note: 'Moisture retention' },
      { name: 'Niacinamide', safe: true, note: 'Calming & brightening' },
    ],
    whyMatch: [
      'Perfect for your dry skin concerns',
      'Free from fragrances you avoid',
      'Dermatologist recommended for sensitivity',
    ],
    usersLikeYou: 847,
  },
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);

  const product = mockProductDetails[Number(id)] || mockProductDetails[1];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={() => setIsFavorite(!isFavorite)}
            className="p-2 rounded-full hover:bg-secondary transition-colors"
          >
            <Heart
              className={cn(
                'w-6 h-6',
                isFavorite ? 'fill-zwina-rose text-zwina-rose' : 'text-muted-foreground'
              )}
            />
          </button>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6 animate-fade-in pb-24">
        {/* Product Hero */}
        <div className="bg-card rounded-3xl p-8 shadow-warm flex flex-col items-center">
          <span className="text-7xl mb-4">{product.image}</span>
          <p className="text-sm text-muted-foreground">{product.brand}</p>
          <h1 className="font-display text-xl font-semibold text-center">{product.name}</h1>
          <div className="mt-3 flex items-center gap-2">
            <span className="bg-primary text-primary-foreground text-sm font-medium px-3 py-1 rounded-full">
              {product.match}% match
            </span>
            <span className="text-lg font-semibold text-zwina-gold">{product.price}</span>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h2 className="font-display text-lg font-semibold">About</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{product.description}</p>
        </div>

        {/* Why It Matches */}
        <div className="bg-glow-hair/10 border border-glow-hair/30 rounded-2xl p-4 space-y-3">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            ✨ Why This Matches You
          </h2>
          <ul className="space-y-2">
            {product.whyMatch.map((reason: string, i: number) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-glow-hair flex-shrink-0 mt-0.5" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Ingredients */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Key Ingredients</h2>
          <div className="space-y-2">
            {product.ingredients.map((ing: any, i: number) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between p-3 rounded-xl border',
                  ing.safe
                    ? 'bg-glow-hair/5 border-glow-hair/20'
                    : 'bg-destructive/5 border-destructive/20'
                )}
              >
                <div className="flex items-center gap-3">
                  {ing.safe ? (
                    <Check className="w-4 h-4 text-glow-hair" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  )}
                  <span className="font-medium text-sm">{ing.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{ing.note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-card rounded-2xl p-4 shadow-warm flex items-center gap-3">
          <div className="w-12 h-12 bg-zwina-rose/20 rounded-full flex items-center justify-center">
            <Users className="w-6 h-6 text-zwina-rose" />
          </div>
          <div>
            <p className="font-medium text-foreground">{product.usersLikeYou} users like you</p>
            <p className="text-sm text-muted-foreground">love this product</p>
          </div>
        </div>
      </div>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border">
        <div className="max-w-lg mx-auto">
          <Button className="w-full h-14 rounded-2xl text-lg font-medium bg-gradient-olive">
            <ExternalLink className="w-5 h-5 mr-2" />
            Buy Now {product.price}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
