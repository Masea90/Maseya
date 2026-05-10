// Enriches maseya_products with missing images and ingredients from
// Open Food Facts, Open Beauty Facts, and UPC Item DB. Runs via pg_cron
// daily, or can be invoked manually from the admin dev panel.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface MaseyaRow {
  barcode: string;
  product_name: string | null;
  brand: string | null;
  category: string | null;
  ingredients_text: string | null;
  image_url: string | null;
}

interface Enriched {
  product_name?: string | null;
  brand?: string | null;
  ingredients_text?: string | null;
  image_url?: string | null;
}

const safeFetchJson = async (url: string, timeoutMs = 6000): Promise<any | null> => {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "MASEYA-enrich/1.0 (https://maseya.es)" },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

const fromOFF = async (barcode: string): Promise<Enriched | null> => {
  const j = await safeFetchJson(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
  );
  const p = j?.product;
  if (!p) return null;
  return {
    product_name: p.product_name_es || p.product_name || null,
    brand: p.brands || null,
    image_url: p.image_front_url || p.image_url || null,
    ingredients_text:
      p.ingredients_text_es || p.ingredients_text || p.ingredients_text_en || null,
  };
};

const fromOBF = async (barcode: string): Promise<Enriched | null> => {
  const j = await safeFetchJson(
    `https://world.openbeautyfacts.org/api/v2/product/${barcode}.json`
  );
  const p = j?.product;
  if (!p) return null;
  return {
    product_name: p.product_name_es || p.product_name || null,
    brand: p.brands || null,
    image_url: p.image_front_url || p.image_url || null,
    ingredients_text:
      p.ingredients_text_es || p.ingredients_text || p.ingredients_text_en || null,
  };
};

const fromUpcItemDb = async (barcode: string): Promise<Enriched | null> => {
  const j = await safeFetchJson(
    `https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`
  );
  const item = j?.items?.[0];
  if (!item) return null;
  return {
    product_name: item.title || null,
    brand: item.brand || null,
    image_url: Array.isArray(item.images) ? item.images[0] || null : null,
    ingredients_text: null,
  };
};

const merge = (current: MaseyaRow, found: Enriched[]): Partial<MaseyaRow> => {
  const out: Partial<MaseyaRow> = {};
  if (!current.image_url) {
    const img = found.map(f => f.image_url).find(v => !!v);
    if (img) out.image_url = img;
  }
  if (!current.ingredients_text) {
    const ing = found.map(f => f.ingredients_text).find(v => !!v && v.trim().length >= 5);
    if (ing) out.ingredients_text = ing;
  }
  if (!current.product_name || current.product_name === 'Producto sin nombre') {
    const nm = found.map(f => f.product_name).find(v => !!v);
    if (nm) out.product_name = nm;
  }
  if (!current.brand) {
    const br = found.map(f => f.brand).find(v => !!v);
    if (br) out.brand = br;
  }
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) {
      throw new Error("Missing Supabase env vars");
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: rows, error } = await admin
      .from("maseya_products")
      .select("barcode, product_name, brand, category, ingredients_text, image_url")
      .or("image_url.is.null,ingredients_text.is.null,ingredients_text.eq.")
      .limit(50);

    if (error) {
      console.error("[enrich] query error", error);
      return new Response(JSON.stringify({ error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const products = (rows ?? []) as MaseyaRow[];
    let enriched = 0;
    let stillMissing = 0;

    for (const row of products) {
      const found: Enriched[] = [];
      const off = await fromOFF(row.barcode); if (off) found.push(off);
      const obf = await fromOBF(row.barcode); if (obf) found.push(obf);
      // Only call UPC if still missing image or name to save quota
      const stillNeeds = !found.some(f => !!f.image_url) || !row.product_name;
      if (stillNeeds) {
        const upc = await fromUpcItemDb(row.barcode);
        if (upc) found.push(upc);
      }

      const patch = merge(row, found);
      if (Object.keys(patch).length === 0) {
        stillMissing++;
        continue;
      }

      const { error: upErr } = await admin
        .from("maseya_products")
        .update(patch)
        .eq("barcode", row.barcode);
      if (upErr) {
        console.error("[enrich] update error", row.barcode, upErr);
        stillMissing++;
      } else {
        enriched++;
      }
    }

    const result = {
      scanned: products.length,
      enriched,
      still_missing: stillMissing,
    };
    console.log("[enrich] result", result);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[enrich] internal error", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
