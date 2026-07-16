/**
 * Temporary validation script: computeNutriScore vs OFF official grade.
 * Run: bun run scripts/validate-nutriscore.ts
 */
import { computeNutriScore, detectNutriCategory } from '../src/lib/nutriscore';

interface OFFProd {
  code: string;
  product_name?: string;
  nutriscore_grade?: string;
  nutriscore_data?: Record<string, unknown>;
  nutriscore?: Record<string, unknown>;
  nutriments?: Record<string, unknown>;
  categories_tags?: string[];
  additives_tags?: string[];
  ingredients_analysis_tags?: string[];
}

const FIELDS = [
  'code', 'product_name', 'nutriscore_grade', 'nutriscore_data', 'nutriscore',
  'nutriments', 'categories_tags', 'additives_tags', 'ingredients_analysis_tags',
].join(',');

async function search(categoryTag: string, pageSize: number, page = 1): Promise<OFFProd[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?action=process&tagtype_0=categories&tag_contains_0=contains&tag_0=${encodeURIComponent(categoryTag)}&sort_by=unique_scans_n&page_size=${pageSize}&page=${page}&json=true&fields=${FIELDS}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'maseya-validator/1.0' } });
      if (!res.ok) { await new Promise(r => setTimeout(r, 2000)); continue; }
      const j = await res.json() as { products?: OFFProd[] };
      return (j.products || []).filter(p => ['a','b','c','d','e'].includes((p.nutriscore_grade || '').toLowerCase()));
    } catch { await new Promise(r => setTimeout(r, 2000)); }
  }
  return [];
}
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

interface Bucket { tag: string; count: number; label: string }
const BUCKETS: Bucket[] = [
  { tag: 'snacks', count: 60, label: 'general' },
  { tag: 'beverages', count: 50, label: 'beverage' },
  { tag: 'cheeses', count: 40, label: 'cheese' },
  { tag: 'vegetable-fats', count: 20, label: 'fat' },
  { tag: 'oils', count: 20, label: 'fat' },
  { tag: 'meats', count: 30, label: 'red-meat/general' },
  { tag: 'dairies', count: 30, label: 'general/beverage' },
];

async function main() {
  const all: Array<{ p: OFFProd; bucket: string }> = [];
  for (const b of BUCKETS) {
    const prods = await search(b.tag, b.count);
    for (const p of prods) all.push({ p, bucket: b.tag });
    console.log(`[fetch] ${b.tag}: ${prods.length}`);
    await sleep(1500);
  }
  console.log(`Total fetched: ${all.length}`);

  const byCat = new Map<string, { total: number; hit: number; mismatches: Array<{ code: string; name: string; ours: string; off: string; oursScore: number; offScore?: number; details?: unknown }> }>();
  let totalHit = 0, totalUsed = 0;

  for (const { p } of all) {
    const off = (p.nutriscore_grade || '').toLowerCase();
    if (!['a', 'b', 'c', 'd', 'e'].includes(off)) continue;
    const res = computeNutriScore(p.nutriments || {}, p.categories_tags || [], p as unknown as Record<string, unknown>);
    if (!res) continue;
    totalUsed++;
    const key = res.category;
    if (!byCat.has(key)) byCat.set(key, { total: 0, hit: 0, mismatches: [] });
    const b = byCat.get(key)!;
    b.total++;
    if (res.grade === off) {
      b.hit++; totalHit++;
    } else if (b.mismatches.length < 3) {
      // Try to pull OFF's own breakdown for diagnosis
      const nsData = (p.nutriscore_data as Record<string, unknown> | undefined)
        ?? ((p.nutriscore as Record<string, Record<string, unknown>> | undefined)?.['2023']?.data as Record<string, unknown> | undefined);
      b.mismatches.push({
        code: p.code, name: p.product_name || '',
        ours: res.grade, off,
        oursScore: res.score,
        offScore: nsData ? (nsData.score as number) : undefined,
        details: nsData,
      });
    }
  }

  console.log(`\n=== Overall: ${totalHit}/${totalUsed} = ${((totalHit/totalUsed)*100).toFixed(1)}% ===`);
  for (const [k, v] of byCat) {
    console.log(`${k}: ${v.hit}/${v.total} = ${((v.hit/v.total)*100).toFixed(1)}%`);
    for (const m of v.mismatches) {
      console.log(`  MISS ${m.code} ${m.name}: ours=${m.ours}(${m.oursScore}) off=${m.off}${m.offScore != null ? '(' + m.offScore + ')' : ''}`);
      if (m.details) {
        const d = m.details as Record<string, unknown>;
        const short: Record<string, unknown> = {};
        for (const k of ['energy_points', 'sugars_points', 'saturated_fat_points', 'sodium_points', 'salt_points', 'fiber_points', 'proteins_points', 'fruits_vegetables_legumes_points', 'fruits_vegetables_nuts_colza_walnut_olive_oils_points', 'is_beverage', 'is_water', 'is_cheese', 'is_fat', 'positive_points', 'negative_points']) {
          if (k in d) short[k] = d[k];
        }
        console.log(`    off breakdown:`, short);
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
