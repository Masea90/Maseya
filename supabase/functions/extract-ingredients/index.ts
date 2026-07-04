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
  "ingredients_text": "complete ingredient list"
}
Use empty string if field not found. Include ALL ingredients exactly as written.`;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ANON_WINDOW_MS = 24 * 60 * 60 * 1000;
const ANON_MAX_REQUESTS = 3;
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth: accept either a real user JWT or the publishable/anon key.
    // Anonymous scans are allowed (3 per client/day in-memory); invalid user
    // JWTs still return 401 so the client can show the login action.
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
      const { data: claimsData, error: claimsError } =
        await supabaseClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) return json({ error: "session_expired" }, 401);
    }

    const body = await req.json();
    // Accept new (front_image + ingredients_image) or legacy (image)
    const front = body.front_image as string | undefined;
    const ingr = body.ingredients_image as string | undefined;
    const single = body.image as string | undefined;

    const images: string[] = [];
    if (front) images.push(front);
    if (ingr) images.push(ingr);
    if (!images.length && single) images.push(single);

    if (!images.length) return json({ error: "Missing image" }, 400);

    for (const i of images) {
      if (typeof i !== "string") return json({ error: "Invalid image" }, 400);
      if (measure(i) > MAX_IMAGE_BYTES) return json({ error: "image_too_large" }, 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

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

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      if (response.status === 429) return json({ error: "rate_limit" }, 429);
      if (response.status === 402) return json({ error: "payment_required" }, 402);
      return json({ error: "ai_error" }, 500);
    }

    const data = await response.json();
    const raw: string = data.choices?.[0]?.message?.content || "";

    let extracted: { product_name?: string; brand?: string; category?: string; ingredients_text?: string } = {};
    const tryParse = (s: string) => {
      try { return JSON.parse(s); } catch { return null; }
    };
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    let parsed = tryParse(cleaned);
    if (!parsed) {
      // Fallback: extract first {...} block from noisy responses
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
      console.warn("no_ingredients — extracted:", JSON.stringify(extracted).slice(0, 400), "raw:", raw.slice(0, 400));
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

    // Optional server-side contribution to maseya_products (bypass RLS via
    // service role) so anonymous scans also feed the shared database.
    let saved = false;
    const rawBarcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
    const isRealBarcode = rawBarcode.length > 0 && !rawBarcode.startsWith("photo_");
    if (isRealBarcode) {
      try {
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        if (serviceKey && supabaseUrl) {
          const admin = createClient(supabaseUrl, serviceKey);

          // Upload front image to Storage (private bucket, permanent signed URL)
          let imageUrl: string | null = null;
          if (front) {
            try {
              const b64 = front.startsWith("data:") ? front.slice(front.indexOf(",") + 1) : front;
              const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
              const path = `contrib/${rawBarcode}-${Date.now()}.jpg`;
              const { error: upErr } = await admin.storage
                .from("product-images")
                .upload(path, bin, { contentType: "image/jpeg", upsert: true });
              if (upErr) {
                console.warn("[extract] storage upload failed:", upErr.message);
              } else {
                const { data: signed } = await admin.storage
                  .from("product-images")
                  .createSignedUrl(path, 60 * 60 * 24 * 365 * 10); // 10 years
                imageUrl = signed?.signedUrl ?? null;
              }
            } catch (e) {
              console.warn("[extract] image processing failed:", e);
            }
          }

          // Don't overwrite verified rows
          const { data: existing } = await admin
            .from("maseya_products")
            .select("verified")
            .eq("barcode", rawBarcode)
            .maybeSingle();

          if (!existing?.verified) {
            const payload: Record<string, unknown> = {
              barcode: rawBarcode,
              product_name,
              brand: brand || null,
              category,
              ingredients_text: ingredients,
              source: "photo",
              verified: false,
              submitted_by: null,
            };
            if (imageUrl) payload.image_url = imageUrl;
            const { error: upsertErr } = await admin
              .from("maseya_products")
              .upsert(payload, { onConflict: "barcode" });
            if (upsertErr) {
              console.error("[extract] maseya_products upsert failed:", upsertErr.message);
            } else {
              saved = true;
            }
          } else {
            console.info("[extract] skipping upsert — verified row exists for", rawBarcode);
          }
        }
      } catch (e) {
        console.error("[extract] contribution error:", e);
      }
    }

    return json({
      product_name,
      brand,
      category,
      ingredients_text: ingredients,
      saved,
    }, 200);

  } catch (e) {
    console.error("extract-ingredients internal error:", e);
    return json({ error: "internal_error" }, 500);
  }
});
