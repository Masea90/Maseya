/**
 * Amazon Affiliate URL utility
 * Appends or replaces the affiliate tag on Amazon URLs.
 */

const AFFILIATE_TAG = import.meta.env.VITE_AMAZON_AFFILIATE_TAG || 'maseya-21';

export function buildAmazonAffiliateUrl(url: string): string {
  try {
    const u = new URL(url);
    // Replace or set the tag parameter
    u.searchParams.set('tag', AFFILIATE_TAG);
    return u.toString();
  } catch {
    // If URL parsing fails, try simple append
    if (url.includes('tag=')) {
      return url.replace(/tag=[^&]+/, `tag=${AFFILIATE_TAG}`);
    }
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}tag=${AFFILIATE_TAG}`;
  }
}
