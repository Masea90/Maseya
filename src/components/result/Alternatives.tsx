import type { ProductData } from '@/lib/productLookup';

interface Props {
  current: ProductData;
  currentScore: number;
}

// Alternatives are only meaningful when we have OFF/OBF category data to
// compare against. For photo-contributed products (source: 'photo') or items
// without a real category, we render nothing instead of a placeholder.
export const Alternatives = ({ current }: Props) => {
  const hasCategoryData =
    current.source !== 'photo' &&
    current.category !== 'unknown' &&
    !!current.category;

  if (!hasCategoryData) return null;

  // TODO: real recommendation engine. Until it ships we render nothing
  // rather than a "coming soon" placeholder.
  return null;
};
