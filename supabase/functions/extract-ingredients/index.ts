import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an expert at reading product labels. Extract the following and return ONLY valid JSON:
{
  "product_name": "full product name as shown",
  "brand": "brand name",
  "category": "food or cosmetic",
  "ingredients_text": "complete ingredient list",
  "category_tag": "most specific Open Food Facts / Open Beauty Facts category tag"
}
Rules for "category_tag":
- Always in English, prefixed with "en:", lowercase, words separated by hyphens.
- Choose the MOST SPECIFIC reasonable category (e.g. "en:coconut-oils" not just "en:vegetable-oils"; "en:face-creams" not just "en:cosmetics").
- Examples: "en:vegetable-oils", "en:coconut-oils", "en:biscuits", "en:yogurts", "en:breakfast-cereals", "en:shampoos", "en:face-creams", "en:body-lotions", "en:toothpastes".
- If unsure, fall back to a more generic valid category. Never invent tags.
Use empty string if any field is not found. Include ALL ingredients exactly as written.`;

const NUTRITION_SYSTEM_PROMPT = `You extract nutrition facts from a product label photo. Return ONLY valid JSON matching:
{
  "energy_kj_100g": number|null,
  "energy_kcal_100g": number|null,
  "fat_100g": number|null,
  "saturated_fat_100g": number|null,
  "carbohydrates_100g": number|null,
  "sugars_100g": number|null,
  "fiber_100g": number|null,
  "proteins_100g": number|null,
  "salt_100g": number|null,
  "sodium_100g": number|null,
  "serving_size_g": number|null,
  "basis_detected": "per_100g" | "per_serving" | "unknown",
  "confidence": number
}
STRICT RULES:
- ALWAYS provide values per 100 g / 100 ml. Use the "per 100 g" (or "por 100 g", "pour 100 g") column when present.
- If the table only provides per-portion values, set basis_detected to "per_serving" and set every *_100g field to null. NEVER convert per-portion to per-100g yourself.
- Decimal separator = "." — convert European commas ("2,5" → 2.5).
- Extract kJ and kcal separately when both appear. Do NOT compute one from the other.
- Extract salt and/or sodium as they appear on the label. Do NOT convert between them.
- Missing value → null. NEVER invent values.
- "<0,5" → 0.5. "trazas" / "traces" → 0.
- confidence is your own 0-1 estimate of legibility.`;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ANON_WINDOW_MS = 24 * 60 * 60 * 1000;
const ANON_MAX_REQUESTS = 5;
const anonRequests = new Map<string, { count: number; resetAt: number }>();

const NUTRITIONAL_MARKERS = [
  "kcal", " kj", "kj/", "/kj", "proteinas", "proteínas",
  "porcion", "porción", "dosis", "adulto medio",
  "ingesta de referencia", "fibra alimentaria",
  "valor energetico", "valor energético",
  "hidratos de carbono", "grasas saturadas",
];
const isNutritionalData = (t: string) => {
  const s = t.toLowerCase();
  return NUTRITIONAL_MARKERS.some((m) => s.includes(m));
};

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toDataUrl = (img: string) =>
  img.startsWith("data:") ? img : `data:image/jpeg;base64,${img}`;

const measure = (img: string) =>
  (img.startsWith("data:") ? img.slice(img.indexOf(",") + 1) : img).length;

const getBearerToken = (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return "";
  return authHeader.replace("Bearer ", "").trim();
};

const getAnonKeys = () => {
  const keys = [
    Deno.env.get("SUPABASE_ANON_KEY"),
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
    Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY"),
  ].filter((key): key is string => Boolean(key));
  const keyList = Deno.env.get("SUPABASE_PUBLISHABLE_KEYS");
  if (keyList) {
    try {
      const parsed = JSON.parse(keyList);
      if (Array.isArray(parsed)) keys.push(...parsed.filter((key): key is string => typeof key === "string"));
    } catch {
      keys.push(...keyList.split(",").map((key) => key.trim()).filter(Boolean));
    }
  }
  return keys;
};

const decodeJwtPayload = (token: string): Record<string, unknown> | null => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

const isPublishableToken = (token: string) => {
  if (getAnonKeys().includes(token)) return true;
  return decodeJwtPayload(token)?.role === "anon";
};

const getClientId = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-real-ip") ||
  "anonymous";

const allowAnonymousRequest = (req: Request) => {
  const now = Date.now();
  const clientId = getClientId(req);
  const current = anonRequests.get(clientId);
  if (!current || current.resetAt <= now) {
    anonRequests.set(clientId, { count: 1, resetAt: now + ANON_WINDOW_MS });
    return true;
  }
  if (current.count >= ANON_MAX_REQUESTS) return false;
  current.count += 1;
  return true;
};

// ---------- Nutrition extraction + validation ------------------------------

type NutritionRaw = Record<string, number | string | null | undefined>;

async function callGemini(system: string, userContent: unknown[], apiKey: string) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });
  return resp;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const s = v.trim().replace(",", ".");
    if (!s || s.toLowerCase() === "null") return null;
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

interface NutritionValidation {
  ok: boolean;
  reason?: string;
  nutriments?: Record<string, number>;
  basis?: string;
}

function validateNutrition(raw: NutritionRaw): NutritionValidation {
  const basis = String(raw.basis_detected || "unknown");
  if (basis !== "per_100g") {
    return { ok: false, reason: basis === "per_serving" ? "per_serving_only" : "basis_unknown", basis };
  }
  const kcal = toNum(raw.energy_kcal_100g);
  const kj = toNum(raw.energy_kj_100g);
  const fat = toNum(raw.fat_100g);
  const sat = toNum(raw.saturated_fat_100g);
  const carbs = toNum(raw.carbohydrates_100g);
  const sugars = toNum(raw.sugars_100g);
  const fiber = toNum(raw.fiber_100g);
  const proteins = toNum(raw.proteins_100g);
  const salt = toNum(raw.salt_100g);
  const sodium = toNum(raw.sodium_100g);

  const inRange = (v: number | null, lo: number, hi: number) => v === null || (v >= lo && v <= hi);
  if (!inRange(kcal, 0, 900)) return { ok: false, reason: "kcal_out_of_range" };
  if (!inRange(kj, 0, 3800)) return { ok: false, reason: "kj_out_of_range" };
  for (const [k, v] of [["fat", fat], ["sat", sat], ["carbs", carbs], ["sugars", sugars], ["fiber", fiber], ["proteins", proteins]] as const) {
    if (!inRange(v, 0, 100)) return { ok: false, reason: `${k}_out_of_range` };
  }
  if (!inRange(salt, 0, 30)) return { ok: false, reason: "salt_out_of_range" };
  if (!inRange(sodium, 0, 30)) return { ok: false, reason: "sodium_out_of_range" };

  if (sat !== null && fat !== null && sat > fat + 0.2) return { ok: false, reason: "sat_gt_fat" };
  if (sugars !== null && carbs !== null && sugars > carbs + 0.5) return { ok: false, reason: "sugars_gt_carbs" };

  if (kcal !== null && fat !== null && carbs !== null && proteins !== null) {
    const est = fat * 9 + carbs * 4 + proteins * 4;
    if (est > 0 && kcal > 20) {
      const ratio = kcal / est;
      if (ratio < 0.75 || ratio > 1.25) return { ok: false, reason: "energy_macros_incoherent" };
    }
  }

  // Require at least one useful signal
  if (kcal === null && kj === null && fat === null && sugars === null && salt === null && sodium === null) {
    return { ok: false, reason: "no_values" };
  }

  const nutriments: Record<string, number> = {};
  const set = (k: string, v: number | null) => { if (v !== null) nutriments[k] = v; };
  set("energy-kcal_100g", kcal);
  set("energy-kj_100g", kj);
  set("fat_100g", fat);
  set("saturated-fat_100g", sat);
  set("carbohydrates_100g", carbs);
  set("sugars_100g", sugars);
  set("fiber_100g", fiber);
  set("proteins_100g", proteins);
  set("salt_100g", salt);
  set("sodium_100g", sodium);
  return { ok: true, nutriments, basis };
}

async function extractNutrition(image: string, apiKey: string): Promise<NutritionValidation & { rawResponse?: string }> {
  try {
    const resp = await callGemini(NUTRITION_SYSTEM_PROMPT, [
      { type: "text", text: "Extract the nutrition facts table from this image following the strict rules." },
      { type: "image_url", image_url: { url: toDataUrl(image) } },
    ], apiKey);
    if (!resp.ok) {
      const t = await resp.text();
      console.error("[nutrition] gemini error", resp.status, t);
      return { ok: false, reason: "ai_error" };
    }
    const data = await resp.json();
    const rawTxt = (data.choices?.[0]?.message?.content || "").replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed: NutritionRaw | null = null;
    try { parsed = JSON.parse(rawTxt); } catch {
      const m = rawTxt.match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch {} }
    }
    if (!parsed) return { ok: false, reason: "parse_failed", rawResponse: rawTxt.slice(0, 300) };
    return validateNutrition(parsed);
  } catch (e) {
    console.error("[nutrition] extraction error", e);
    return { ok: false, reason: "internal_error" };
  }
}

// ---------- Handler --------------------------------------------------------

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const token = getBearerToken(req);
    if (!token) return json({ error: "Unauthorized" }, 401);
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? "";
    const isAnonKey = isPublishableToken(token);
    if (isAnonKey) {
      if (!allowAnonymousRequest(req)) return json({ error: "rate_limit" }, 429);
    } else {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        anonKey,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) return json({ error: "session_expired" }, 401);
    }

    const body = await req.json();
    const front = body.front_image as string | undefined;
    const ingr = body.ingredients_image as string | undefined;
    const single = body.image as string | undefined;
    const nutrition = body.nutrition_image as string | undefined;
    const rawBarcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
    const isRealBarcode = rawBarcode.length > 0 && !rawBarcode.startsWith("photo_");

    // Size guard for all images
    for (const i of [front, ingr, single, nutrition]) {
      if (i !== undefined) {
        if (typeof i !== "string") return json({ error: "Invalid image" }, 400);
        if (measure(i) > MAX_IMAGE_BYTES) return json({ error: "image_too_large" }, 413);
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // -------- Nutrition-only mode: only nutrition_image + real barcode --------
    if (nutrition && !front && !ingr && !single) {
      if (!isRealBarcode) return json({ error: "barcode_required" }, 400);
      const result = await extractNutrition(nutrition, LOVABLE_API_KEY);
      if (!result.ok) {
        return json({ error: "nutrition_rejected", reason: result.reason }, 422);
      }
      // Persist
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        if (serviceKey && supabaseUrl) {
          const admin = createClient(supabaseUrl, serviceKey);
          const { data: existing } = await admin
            .from("maseya_products").select("verified").eq("barcode", rawBarcode).maybeSingle();
          if (!existing?.verified) {
            const { error: upErr } = await admin
              .from("maseya_products")
              .update({ nutriments: result.nutriments })
              .eq("barcode", rawBarcode);
            if (upErr) console.error("[extract] nutriments update failed", upErr.message);
          }
        }
      } catch (e) { console.error("[extract] nutrition persist error", e); }
      return json({ ok: true, nutriments: result.nutriments }, 200);
    }

    // -------- Standard ingredient extraction ---------------------------------
    const images: string[] = [];
    if (front) images.push(front);
    if (ingr) images.push(ingr);
    if (!images.length && single) images.push(single);
    if (!images.length) return json({ error: "Missing image" }, 400);

    const userContent: any[] = [
      {
        type: "text",
        text:
          images.length === 2
            ? "First image is the product front (use for product_name, brand, category). Second image is the ingredients label. Combine both."
            : "Extract everything from this product label image.",
      },
      ...images.map((img) => ({ type: "image_url", image_url: { url: toDataUrl(img) } })),
    ];

    const response = await callGemini(SYSTEM_PROMPT, userContent, LOVABLE_API_KEY);

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) return json({ error: "rate_limit" }, 429);
      if (response.status === 402) return json({ error: "payment_required" }, 402);
      return json({ error: "ai_error" }, 500);
    }

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content || "";

    let extracted: { product_name?: string; brand?: string; category?: string; ingredients_text?: string; category_tag?: string } = {};
    const tryParse = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed = tryParse(cleaned);
    if (!parsed) {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = tryParse(match[0]);
    }
    if (!parsed) {
      console.error("Failed to parse AI response. Raw content:", raw);
      return json({ error: "parse_failed" }, 422);
    }
    extracted = parsed as typeof extracted;

    const ingredients = (extracted.ingredients_text || "").trim();
    if (!ingredients || ingredients.length < 5) {
      return json({ error: "no_ingredients" }, 422);
    }
    if (isNutritionalData(ingredients)) {
      return json({
        error: "nutritional_table_detected",
        message: "Parece que fotografiaste la tabla nutricional. Por favor fotografía la lista de ingredientes.",
      }, 422);
    }

    const category = extracted.category === "food" ? "food" : "cosmetic";
    const product_name = (extracted.product_name || "").trim() || "Producto fotografiado";
    const brand = (extracted.brand || "").trim();
    const rawTag = (extracted.category_tag || "").trim().toLowerCase();
    const category_tag = /^en:[a-z0-9-]+$/.test(rawTag) ? rawTag : null;

    // Optional nutrition extraction (only meaningful for food)
    let nutritionResult: NutritionValidation | null = null;
    if (nutrition && category === "food") {
      nutritionResult = await extractNutrition(nutrition, LOVABLE_API_KEY);
    }

    let saved = false;
    if (isRealBarcode) {
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        if (serviceKey && supabaseUrl) {
          const admin = createClient(supabaseUrl, serviceKey);

          let imageUrl: string | null = null;
          if (front) {
            try {
              const b64 = front.startsWith("data:") ? front.slice(front.indexOf(",") + 1) : front;
              const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              const path = `contrib/${rawBarcode}-${Date.now()}.jpg`;
              const { error: upErr } = await admin.storage
                .from("product-images")
                .upload(path, bin, { contentType: "image/jpeg", upsert: true });
              if (upErr) console.warn("[extract] storage upload failed:", upErr.message);
              else {
                const { data: signed } = await admin.storage
                  .from("product-images")
                  .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
                imageUrl = signed?.signedUrl ?? null;
              }
            } catch (e) { console.warn("[extract] image processing failed:", e); }
          }

          const { data: existing } = await admin
            .from("maseya_products").select("verified").eq("barcode", rawBarcode).maybeSingle();
          if (!existing?.verified) {
            const payload: Record<string, unknown> = {
              barcode: rawBarcode,
              product_name, brand: brand || null, category,
              category_tag, ingredients_text: ingredients,
              source: "photo", verified: false, submitted_by: null,
            };
            if (imageUrl) payload.image_url = imageUrl;
            if (nutritionResult?.ok && nutritionResult.nutriments) {
              payload.nutriments = nutritionResult.nutriments;
            }
            const { error: upsertErr } = await admin
              .from("maseya_products").upsert(payload, { onConflict: "barcode" });
            if (upsertErr) console.error("[extract] maseya_products upsert failed:", upsertErr.message);
            else saved = true;
          }
        }
      } catch (e) { console.error("[extract] contribution error:", e); }
    }

    const responsePayload: Record<string, unknown> = {
      product_name, brand, category, category_tag,
      ingredients_text: ingredients, saved,
    };
    if (nutritionResult) {
      if (nutritionResult.ok) responsePayload.nutriments = nutritionResult.nutriments;
      else responsePayload.nutrition_rejected = nutritionResult.reason;
    }
    return json(responsePayload, 200);

  } catch (e) {
    console.error("extract-ingredients internal error:", e);
    return json({ error: "internal_error" }, 500);
  }
});
