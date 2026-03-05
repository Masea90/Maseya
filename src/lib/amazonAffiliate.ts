/**
 * Amazon Affiliate URL utility
 * Appends the correct geo-specific affiliate tag based on the Amazon domain.
 */

const AMAZON_TAG_BY_HOST: Record<string, string> = {
  "www.amazon.es": "maseya-21",
  "amazon.es": "maseya-21",
  "www.amazon.de": "maseya0b-21",
  "amazon.de": "maseya0b-21",
  "www.amazon.fr": "maseya05-21",
  "amazon.fr": "maseya05-21",
  "www.amazon.it": "maseya00-21",
  "amazon.it": "maseya00-21",
  "www.amazon.co.uk": "maseya0a-21",
  "amazon.co.uk": "maseya0a-21",
};

export function buildAmazonAffiliateUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const tag = AMAZON_TAG_BY_HOST[url.hostname];

    // If no tag for this host, don't modify the link
    if (!tag) return rawUrl;

    url.searchParams.set("tag", tag);
    return url.toString();
  } catch {
    return rawUrl;
  }
}
