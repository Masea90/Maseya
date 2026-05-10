// Imports popular Spanish products from Open Food Facts (OFF) and
// Open Beauty Facts (OBF) into the maseya_products table.
// Triggered manually from the dev panel or via scheduled pg_cron.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  image_front_url?: string;
  ingredients_text?: string;
  ingredients_text_es?: string;
  nutriscore_grade?: string;
  labels_tags?: string[];
  categories_tags?: string[];
  ingredients_analysis_tags?: string[];
}

const fetchPage = async (host: string, page: number): Promise<OffProduct[]> => {
  const fields = [
    "code", "product_name", "product_name_es", "brands",
    "image_front_url", "nutriscore_grade", "ingredients_text",
    "ingredients_text_es", "labels_tags", "categories_tags",
    "ingredients_analysis_tags",
  ].join(",");

  const url = `https://${host}/cgi/search.pl?action=process` +
    `&tagtype_0=countries&tag_contains_0=contains&tag_0=spain` +
    `&sort_by=unique_scans_n&page_size=200&page=${page}` +
    `&json=true&fields=${fields}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "MASEYA-import/1.0 (https://maseya.es)" },
    });
    if (!res.ok) {
      console.error("[import] http", host, res.status);
      return [];
    }
    const j = await res.json();
    return Array.isArray(j?.products) ? j.products : [];
  } catch (e) {
    console.error("[import] fetch error", host, e);
    return [];
  } finally {
    clearTimeout(timer);
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SERVICE_KEY) throw new Error("Missing env");
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let page = 1;
    let source: "off" | "obf" = "off";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (typeof body?.page === "number") page = body.page;
        if (body?.source === "obf") source = "obf";
      } catch {}
    } else {
      const u = new URL(req.url);
      const p = u.searchParams.get("page");
      if (p) page = parseInt(p, 10) || 1;
      if (u.searchParams.get("source") === "obf") source = "obf";
    }

    const host = source === "off"
      ? "world.openfoodfacts.org"
      : "world.openbeautyfacts.org";
    const category = source === "off" ? "food" : "cosmetic";
    const sourceTag = source === "off" ? "off_import" : "obf_import";

    const products = await fetchPage(host, page);
    if (products.length === 0) {
      return new Response(JSON.stringify({ imported: 0, skipped: 0, page, total_so_far: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const barcodes = products.map(p => String(p.code || "")).filter(Boolean);
    const { data: existingRows } = await admin
      .from("maseya_products")
      .select("barcode")
      .in("barcode", barcodes);
    const existing = new Set((existingRows ?? []).map((r: any) => r.barcode));

    const rows: any[] = [];
    let skipped = 0;

    for (const p of products) {
      const barcode = String(p.code || "").trim();
      if (!barcode) { skipped++; continue; }
      if (existing.has(barcode)) { skipped++; continue; }

      const name = (p.product_name_es || p.product_name || "").trim();
      const ingredients = (p.ingredients_text_es || p.ingredients_text || "").trim();
      if (!name && !ingredients) { skipped++; continue; }

      rows.push({
        barcode,
        product_name: name || "Producto sin nombre",
        brand: (p.brands || "").split(",")[0]?.trim() || null,
        category,
        ingredients_text: ingredients || null,
        image_url: p.image_front_url || null,
        source: sourceTag,
        verified: false,
        last_enriched_at: new Date().toISOString(),
      });
    }

    let imported = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50);
      const { error } = await admin
        .from("maseya_products")
        .upsert(batch, { onConflict: "barcode", ignoreDuplicates: true });
      if (error) {
        console.error("[import] upsert error", error);
      } else {
        imported += batch.length;
      }
    }

    const { count: totalCount } = await admin
      .from("maseya_products")
      .select("*", { count: "exact", head: true });

    const result = {
      imported,
      skipped,
      page,
      source: sourceTag,
      total_so_far: totalCount ?? null,
    };
    console.log("[import] done", result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[import] internal error", e);
    return new Response(JSON.stringify({ error: "internal_error", message: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
