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
  "category": "food or cosmetic or other",
  "ingredients_text": "complete ingredient list",
  "category_tag": "most specific Open Food Facts / Open Beauty Facts category tag",
  "is_supplement": true or false
}
Rules for "category":
- "food" for edible products (drinks, snacks, groceries…)
- "cosmetic" for personal care / beauty products
- "other" ONLY when the image is clearly NOT a food or cosmetic product (a book, a toy, cleaning products, electronics, medication, etc.). When "other", return empty strings for ingredients_text and category_tag.
Rules for "category_tag":
- Always in English, prefixed with "en:", lowercase, words separated by hyphens.
- Choose the MOST SPECIFIC reasonable category (e.g. "en:coconut-oils" not just "en:vegetable-oils"; "en:face-creams" not just "en:cosmetics").
- Examples: "en:vegetable-oils", "en:coconut-oils", "en:biscuits", "en:yogurts", "en:breakfast-cereals", "en:shampoos", "en:face-creams", "en:body-lotions", "en:toothpastes".
- If unsure, fall back to a more generic valid category. Never invent tags.
Rules for "is_supplement" (boolean):
- true when the label shows unambiguous FOOD SUPPLEMENT signals in any language (es/pt/en/fr): "complemento alimenticio", "complementos alimenticios", "suplemento alimentar", "food supplement", "complément alimentaire", "no sobrepasar la cantidad diaria recomendada", "dosis diaria", "toma diaria", "VRN", "Valor de Referencia de Nutriente", "% NRV", "comprimido efervescente", "cápsulas", "comprimidos recubiertos", "no deben utilizarse como sustitutos de una dieta variada".
- true when the product format is clearly capsules / tablets / vials / supplement sachets.
- false for ordinary food and cosmetics.
Use empty string if any field is not found. Include ALL ingredients exactly as written.`;

const NUTRITION_SYSTEM_PROMPT = `You extract nutrition facts from a product label photo. Labels may be a classic column table OR a Spanish/European front-of-pack "GDA" layout with circles/bubbles (e.g. "1/6 PARTE DEL ENVASE (35 g) CONTIENE: ENERGÍA 420 kJ/101 kcal · GRASAS 7,5 g · GRASAS SATURADAS 0,7 g · AZÚCARES 1,4 g · SAL 0,63 g"), often with a small separate line like "Energía por 100 g: 1199 kJ / 289 kcal". Read ALL of these formats.

Return ONLY valid JSON matching:
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
  "energy_kj_serving": number|null,
  "energy_kcal_serving": number|null,
  "fat_serving": number|null,
  "saturated_fat_serving": number|null,
  "carbohydrates_serving": number|null,
  "sugars_serving": number|null,
  "fiber_serving": number|null,
  "proteins_serving": number|null,
  "salt_serving": number|null,
  "sodium_serving": number|null,
  "serving_size_g": number|null,
  "basis_detected": "per_100g" | "per_serving" | "mixed" | "unknown",
  "confidence": number
}
STRICT RULES:
- The *_100g fields are ONLY for values the label states per 100 g / 100 ml ("por 100 g", "per 100 g", "pour 100 g", "Energía por 100 g: …"). Never put a per-portion number there.
- The *_serving fields are ONLY for values stated per portion / ración / "1/6 parte del envase" / "por unidad" / GDA circles.
- ALWAYS fill serving_size_g with the declared portion size in grams (or ml) whenever it appears anywhere on the label — e.g. "(35 g)", "ración de 30 g", "1/6 parte del envase (35 g)". This is essential.
- It is normal and expected that only SOME values are per 100 g (often just energy) while the rest are per portion. Fill both blocks with what each one states; do NOT convert anything yourself — the server does the conversion.
- basis_detected: "per_100g" if every value comes from a per-100 g statement, "mixed" if some are per 100 g and some per portion, "per_serving" if all values are per portion, "unknown" if you cannot tell.
- Decimal separator = "." — convert European commas ("2,5" → 2.5).
- Extract kJ and kcal separately when both appear. Do NOT compute one from the other.
- Extract salt and/or sodium as they appear. Do NOT convert between them.
- Missing value → null. NEVER invent values.
- "<0,5" → 0.5. "trazas" / "traces" → 0.
- confidence is your own 0-1 estimate of legibility.`;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ANON_WINDOW_MS = 24 * 60 * 60 * 1000;
const ANON_MAX_REQUESTS = 5;
const anonRequests = new Map<string, { count: number; resetAt: number }>();

// STRICT nutrition-table detection. Ingredient lists frequently contain
// numbers, percentages and isolated nutrient words ("proteínas de leche"),
// and the old "any marker" heuristic rejected valid ingredient photos.
// A text is a nutrition table only when it shows >= 3 distinct nutrient
// markers AND the numeric structure of a table.
const NUTRITION_MARKER_GROUPS: RegExp[] = [
  /\b(valor(es)? energ[eé]tico|energ[ií]a|energy)\b/,
  /\b\d[\d.,]*\s*(kcal|kj)\b|\bkcal\b[\s\S]*\bkj\b|\bkj\b[\s\S]*\bkcal\b/,
  /\b(grasas|grasa|fat|mati[eè]res grasses)\b[\s\S]{0,40}(saturad|saturat)/,
  /\b(hidratos de carbono|carbohydrate|glucides)\b/,
  /\b(prote[ií]nas?|protein|prot[ée]ines)\b/,
  /\b(sal|salt|sel|sodio|sodium)\b\s*[:\d]/,
  /\b(fibra alimentaria|dietary fibre|fibres)\b/,
];
const NUTRITION_STRUCTURE_RE = /(por|per|pour|\/)\s*100\s*(g|ml)|\b\d[\d.,]*\s*(kcal|kj)\b|ingesta de referencia|reference intake/;

const nutritionMarkerHits = (t: string) =>
  NUTRITION_MARKER_GROUPS.filter((re) => re.test(t)).length;

const isNutritionalData = (t: string) => {
  const s = t.toLowerCase();
  const hits = nutritionMarkerHits(s);
  const structured = NUTRITION_STRUCTURE_RE.test(s);
  console.log("[classify] nutrition-table check → markers:", hits, "structure:", structured);
  return hits >= 3 && structured;
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

const SUPPLEMENT_STRONG = [
  "complemento alimenticio", "complementos alimenticios", "suplemento alimentar",
  "food supplement", "complement alimentaire", "complément alimentaire",
  "no deben utilizarse como sustitutos de una dieta variada",
];
const SUPPLEMENT_WEAK = [
  "dosis diaria", "toma diaria", "daily dose", "dose journaliere", "dose journalière",
  "comprimido efervescente", "comprimidos efervescentes", "comprimidos recubiertos",
  "capsulas", "cápsulas", "capsules", "no sobrepasar la cantidad diaria recomendada",
  // %VRN/%NRV alone is common on fortified ordinary food: weak signal only.
  "valor de referencia de nutriente", "vrn", "nrv",
];
/** Category tags of ordinary food — they veto the supplement classification. */
const FOOD_CATEGORY_TAG_HINTS = [
  "biscuit", "cookie", "cake", "pastr", "snack", "chocolate", "candy", "confectioner",
  "beverage", "drink", "juice", "nectar", "water", "soda", "coffee", "tea",
  "plant-based-beverage", "soy-milk", "soy-based-drink", "milk-substitute",
  "dairy-substitute", "plant-based-milk", "milk", "dairy", "yogurt", "yoghurt", "cheese",
  "breakfast", "cereal", "bread", "pasta", "rice", "legume", "meat", "fish", "seafood",
  "fruit", "vegetable", "nut", "seed", "sauce", "condiment", "soup", "meal", "dessert",
  "ice-cream", "spread", "oil", "butter", "egg", "flour", "sugar", "honey", "jam",
  "crisps", "chips", "pizza", "sandwich", "salad", "charcuterie", "ham",
];
/** Whole-food ingredient words: two or more means it is ordinary food. */
const ORDINARY_FOOD_INGREDIENTS = [
  "zumo", "jugo", "juice", "puré", "pure", "leche", "milk", "agua", "water",
  "harina", "flour", "azúcar", "azucar", "sugar", "aceite", "oil", "sal", "salt",
  "cacao", "cocoa", "trigo", "wheat", "avena", "oats", "arroz", "rice",
  "fruta", "fruit", "tomate", "manzana", "naranja", "mango", "piña", "melocotón",
  "yogur", "nata", "mantequilla", "huevo", "egg", "soja", "soy", "almendra",
];

/** Word-ish match to avoid false positives inside other words. */
function hasSignal(hay: string, needle: string): boolean {
  const esc = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9áéíóúñç])${esc}([^a-z0-9áéíóúñç]|$)`, "i").test(hay);
}
export function detectSupplementText(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t) return false;
  if (SUPPLEMENT_STRONG.some((k) => hasSignal(t, k))) return true;
  return SUPPLEMENT_WEAK.filter((k) => hasSignal(t, k)).length >= 2;
}

function validateNutrition(raw: NutritionRaw): NutritionValidation {
  const basis = String(raw.basis_detected || "unknown");
  const servingG = toNum(raw.serving_size_g);
  const canConvert = servingG !== null && servingG > 0 && servingG <= 1000;
  const factor = canConvert ? 100 / servingG! : 0;

  // Legacy shape: values placed in *_100g while basis says per_serving.
  const servingKeys = [
    "energy_kj_serving", "energy_kcal_serving", "fat_serving", "saturated_fat_serving",
    "carbohydrates_serving", "sugars_serving", "fiber_serving", "proteins_serving",
    "salt_serving", "sodium_serving",
  ];
  const hasServingBlock = servingKeys.some((k) => toNum(raw[k]) !== null);
  const legacyPerServing = basis === "per_serving" && !hasServingBlock;

  let converted = false;
  // Per nutrient: prefer the direct per-100g value; otherwise convert the
  // per-portion value with the declared serving size (rule of three).
  const pick = (key100: string, keyServing: string): number | null => {
    const direct = legacyPerServing ? null : toNum(raw[key100]);
    if (direct !== null) return direct;
    const perServing = legacyPerServing ? toNum(raw[key100]) : toNum(raw[keyServing]);
    if (perServing === null || !canConvert) return null;
    converted = true;
    return Math.round(perServing * factor * 100) / 100;
  };

  const kcal = pick("energy_kcal_100g", "energy_kcal_serving");
  const kj = pick("energy_kj_100g", "energy_kj_serving");
  const fat = pick("fat_100g", "fat_serving");
  const sat = pick("saturated_fat_100g", "saturated_fat_serving");
  const carbs = pick("carbohydrates_100g", "carbohydrates_serving");
  const sugars = pick("sugars_100g", "sugars_serving");
  const fiber = pick("fiber_100g", "fiber_serving");
  const proteins = pick("proteins_100g", "proteins_serving");
  const salt = pick("salt_100g", "salt_serving");
  const sodium = pick("sodium_100g", "sodium_serving");

  console.log("[nutrition] basis:", basis, "serving_g:", servingG, "converted:", converted);

  if ([kcal, kj, fat, sat, carbs, sugars, fiber, proteins, salt, sodium].every((v) => v === null)) {
    return { ok: false, reason: canConvert ? "no_values" : "per_serving_only", basis };
  }

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
        // "Per daily dose / %VRN" tables belong to food supplements: route the
        // client to the supplement branch instead of a generic retry error.
        let supplement = result.reason === "per_serving_only";
        if (supplement) {
          try {
            const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
            const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
            if (serviceKey && supabaseUrl) {
              const admin = createClient(supabaseUrl, serviceKey);
              const { data: row } = await admin
                .from("maseya_products")
                .select("category_tag, product_name, ingredients_text")
                .eq("barcode", rawBarcode).maybeSingle();
              supplement = row?.category_tag === "en:dietary-supplements" ||
                detectSupplementText(`${row?.product_name ?? ""} ${row?.ingredients_text ?? ""}`);
            } else supplement = false;
          } catch { supplement = false; }
        }
        if (supplement) return json({ error: "supplement_detected" }, 422);
        return json({ error: "nutrition_rejected", reason: result.reason }, 422);
      }
      // Persist. UPSERT, not UPDATE: products found in OFF/OBF have no row in
      // maseya_products, so the previous UPDATE matched 0 rows and the table
      // the user photographed was silently dropped — the result page kept
      // asking for the same photo forever.
      let persisted = false;
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        if (serviceKey && supabaseUrl) {
          const admin = createClient(supabaseUrl, serviceKey);
          const { data: existing } = await admin
            .from("maseya_products")
            .select("verified, product_name, category")
            .eq("barcode", rawBarcode).maybeSingle();
          if (!existing?.verified) {
            const bodyName = typeof body.product_name === "string" ? body.product_name.trim() : "";
            const payload: Record<string, unknown> = {
              barcode: rawBarcode,
              nutriments: result.nutriments,
              product_name: existing?.product_name || bodyName || "Producto fotografiado",
              category: existing?.category || "food",
            };
            if (!existing) payload.source = "photo_nutrition";
            const { error: upErr } = await admin
              .from("maseya_products")
              .upsert(payload, { onConflict: "barcode" });
            if (upErr) console.error("[extract] nutriments upsert failed", upErr.message);
            else persisted = true;
          } else persisted = true;
        }
      } catch (e) { console.error("[extract] nutrition persist error", e); }
      console.log("[extract] nutrition-only persisted:", persisted);
      return json({ ok: true, nutriments: result.nutriments, persisted }, 200);
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

    let extracted: { product_name?: string; brand?: string; category?: string; ingredients_text?: string; category_tag?: string; is_supplement?: boolean } = {};
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

    const rawCategory = String(extracted.category || "").toLowerCase();
    if (rawCategory === "other") {
      return json({
        error: "out_of_scope",
        message: "Maseya analiza alimentación y cosmética. Este producto parece de otra categoría.",
      }, 422);
    }

    const ingredients = (extracted.ingredients_text || "").trim();
    if (!ingredients || ingredients.length < 5) {
      return json({ error: "no_ingredients" }, 422);
    }
    if (isNutritionalData(ingredients)) {
      console.log("[classify] REJECTED as nutrition table. Text head:", ingredients.slice(0, 160));
      return json({
        error: "nutritional_table_detected",
        message: "Parece que fotografiaste la tabla nutricional. Por favor fotografía la lista de ingredientes.",
      }, 422);
    }

    const category = rawCategory === "food" ? "food" : "cosmetic";
    const product_name = (extracted.product_name || "").trim() || "Producto fotografiado";
    const brand = (extracted.brand || "").trim();
    const rawTag = (extracted.category_tag || "").trim().toLowerCase();
    let category_tag = /^en:[a-z0-9-]+$/.test(rawTag) ? rawTag : null;

    // Food supplements: never scored with Nutri-Score, so we must not ask for
    // a nutrition table. Persisted by forcing category_tag to
    // "en:dietary-supplements" so future scans of the same barcode land in the
    // supplement branch directly (client isSupplement reads categories_tags).
    // Guard rails (real false positives: fortified biscuits, soy drink with
    // omega 3, probiotic fruit shot): a clear FOOD category_tag from the AI,
    // or an ingredient list made of ordinary foods, vetoes the classification
    // unless the label literally says "complemento alimenticio".
    const literalSupplement = SUPPLEMENT_STRONG.some((k) =>
      hasSignal(`${product_name} ${brand} ${ingredients}`.toLowerCase(), k));
    const foodishTag = !!category_tag && category_tag !== "en:dietary-supplements"
      && FOOD_CATEGORY_TAG_HINTS.some((h) => category_tag!.includes(h));
    const ordinaryFood =
      ORDINARY_FOOD_INGREDIENTS.filter((w) => ingredients.toLowerCase().includes(w)).length >= 2;
    const is_supplement = category === "food" && (
      literalSupplement || (
        !foodishTag && !ordinaryFood && (
          extracted.is_supplement === true ||
          detectSupplementText(`${product_name} ${brand} ${ingredients}`)
        )
      )
    );
    if (is_supplement) category_tag = "en:dietary-supplements";


    // Optional nutrition extraction (only meaningful for food)
    let nutritionResult: NutritionValidation | null = null;
    if (is_supplement) {
      console.log("[classify] supplement detected — skipping nutrition extraction");
    } else if (nutrition && category === "food") {
      console.log("[classify] dedicated nutrition image provided");
      nutritionResult = await extractNutrition(nutrition, LOVABLE_API_KEY);
    } else if (category === "food") {
      // No dedicated table photo: the table is often already visible in the
      // ingredients (or front) photo. Try to read it from what we have so we
      // never ask for a third photo we don't need.
      const candidate = ingr ?? single ?? front;
      if (candidate) {
        console.log("[classify] no nutrition image — attempting table extraction from existing photo");
        const auto = await extractNutrition(candidate, LOVABLE_API_KEY);
        console.log("[classify] auto nutrition result:", auto.ok ? "ok" : auto.reason);
        if (auto.ok) nutritionResult = auto;
      }
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
      ingredients_text: ingredients, saved, is_supplement,
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
