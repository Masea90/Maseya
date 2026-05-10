import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are an ingredient extraction expert. Extract ONLY the ingredient list from the product label photo. Return ONLY a JSON object with this exact format, nothing else:
{
  "product_name": "name if visible, empty string if not",
  "brand": "brand if visible, empty string if not",
  "category": "food or cosmetic",
  "ingredients_text": "full ingredient list as text, comma separated"
}
If no ingredient list is readable, set ingredients_text to an empty string.`;

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB of base64 payload

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth check (mirror chat function) ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }

    const { image } = await req.json();
    if (!image || typeof image !== "string") {
      return json({ error: "Missing image" }, 400);
    }

    // Strip data URL prefix when measuring
    const base64Part = image.startsWith("data:")
      ? image.slice(image.indexOf(",") + 1)
      : image;
    if (base64Part.length > MAX_IMAGE_BYTES) {
      return json({ error: "image_too_large" }, 413);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const imageUrl = image.startsWith("data:") ? image : `data:image/jpeg;base64,${image}`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Extract the ingredients from this product label." },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

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
    if (!ingredients || ingredients.length < 10) {
      return json({ error: "no_ingredients" }, 422);
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
