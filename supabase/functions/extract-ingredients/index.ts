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

const getAnonKeys = () =>
  [
    Deno.env.get("SUPABASE_ANON_KEY"),
    Deno.env.get("SUPABASE_PUBLISHABLE_KEY"),
    Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY"),
  ].filter((key): key is string => Boolean(key));

const isPublishableToken = (token: string) => getAnonKeys().includes(token);

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
    const raw = data.choices?.[0]?.message?.content || "";

    let extracted: { product_name?: string; brand?: string; category?: string; ingredients_text?: string } = {};
    try {
      const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
      extracted = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", raw);
      return json({ error: "parse_failed" }, 422);
    }

    const ingredients = (extracted.ingredients_text || "").trim();
    if (!ingredients || ingredients.length < 10) return json({ error: "no_ingredients" }, 422);
    if (isNutritionalData(ingredients)) {
      return json({
        error: "nutritional_table_detected",
        message: "Parece que fotografiaste la tabla nutricional. Por favor fotografía la lista de ingredientes.",
      }, 422);
    }

    const category = extracted.category === "food" ? "food" : "cosmetic";

    return json({
      product_name: (extracted.product_name || "").trim() || "Producto fotografiado",
      brand: (extracted.brand || "").trim(),
      category,
      ingredients_text: ingredients,
    }, 200);
  } catch (e) {
    console.error("extract-ingredients internal error:", e);
    return json({ error: "internal_error" }, 500);
  }
});
