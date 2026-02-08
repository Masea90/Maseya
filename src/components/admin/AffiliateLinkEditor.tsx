import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AffiliateLink } from '@/hooks/useAffiliateLinks';
import { productCatalog } from '@/lib/recommendations';

interface AffiliateLinkEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  link: AffiliateLink | null;
  onSave: (link: Omit<AffiliateLink, 'id'>) => void;
  onUpdate: (id: string, updates: Partial<AffiliateLink>) => void;
}

const EMOJI_OPTIONS = ['🛒', '📦', '🌿', '🧪', '💄', '✨', '🏪', '🛍️'];

const AffiliateLinkEditor = ({ open, onOpenChange, link, onSave, onUpdate }: AffiliateLinkEditorProps) => {
  const [productId, setProductId] = useState(1);
  const [retailerName, setRetailerName] = useState('');
  const [retailerIcon, setRetailerIcon] = useState('🛒');
  const [affiliateUrl, setAffiliateUrl] = useState('');
  const [isPrimary, setIsPrimary] = useState(false);
  const [sortOrder, setSortOrder] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (link) {
      setProductId(link.product_id);
      setRetailerName(link.retailer_name);
      setRetailerIcon(link.retailer_icon);
      setAffiliateUrl(link.affiliate_url);
      setIsPrimary(link.is_primary);
      setSortOrder(link.sort_order);
    } else {
      setProductId(1);
      setRetailerName('');
      setRetailerIcon('🛒');
      setAffiliateUrl('');
      setIsPrimary(false);
      setSortOrder(0);
    }
    setErrors({});
  }, [link, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    const trimmedName = retailerName.trim();
    if (!trimmedName) {
      newErrors.retailerName = 'Retailer name is required';
    } else if (trimmedName.length > 100) {
      newErrors.retailerName = 'Name must be under 100 characters';
    }

    const trimmedUrl = affiliateUrl.trim();
    if (!trimmedUrl) {
      newErrors.affiliateUrl = 'URL is required';
    } else {
      try {
        new URL(trimmedUrl);
      } catch {
        newErrors.affiliateUrl = 'Must be a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const data = {
      product_id: productId,
      retailer_name: retailerName.trim(),
      retailer_icon: retailerIcon,
      affiliate_url: affiliateUrl.trim(),
      is_primary: isPrimary,
      sort_order: sortOrder,
    };

    if (link) {
      onUpdate(link.id, data);
    } else {
      onSave(data);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{link ? 'Edit Affiliate Link' : 'Add Affiliate Link'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product */}
          <div className="space-y-1.5">
            <Label>Product</Label>
            <Select
              value={String(productId)}
              onValueChange={(v) => setProductId(Number(v))}
              disabled={!!link}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {productCatalog.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.brand} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Retailer Name */}
          <div className="space-y-1.5">
            <Label>Retailer Name</Label>
            <Input
              value={retailerName}
              onChange={(e) => setRetailerName(e.target.value)}
              placeholder="e.g. Amazon"
              maxLength={100}
            />
            {errors.retailerName && (
              <p className="text-xs text-destructive">{errors.retailerName}</p>
            )}
          </div>

          {/* Retailer Icon */}
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setRetailerIcon(emoji)}
                  className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-colors ${
                    retailerIcon === emoji
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Affiliate URL */}
          <div className="space-y-1.5">
            <Label>Affiliate URL</Label>
            <Input
              value={affiliateUrl}
              onChange={(e) => setAffiliateUrl(e.target.value)}
              placeholder="https://..."
              maxLength={2048}
            />
            {errors.affiliateUrl && (
              <p className="text-xs text-destructive">{errors.affiliateUrl}</p>
            )}
          </div>

          {/* Sort order & Primary */}
          <div className="flex items-center gap-4">
            <div className="space-y-1.5 flex-1">
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
                max={99}
              />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <Switch checked={isPrimary} onCheckedChange={setIsPrimary} />
              <Label>Primary</Label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {link ? 'Save Changes' : 'Add Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AffiliateLinkEditor;
