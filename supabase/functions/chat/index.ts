import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_CATALOG = `
Available products in the MASEYA catalog (use catalog_id when recommending):
- catalog_id:3 — The Ordinary Niacinamide 10% + Zinc 1% — Vegan, for oiliness/acne/pores, sensitive-safe
- catalog_id:4 — Olaplex No.7 Bonding Oil — Hair oil, vegan, for all hair types
- catalog_id:5 — CeraVe Hydrating Cleanser — Gentle cleanser with ceramides, for dryness/sensitivity
- catalog_id:6 — Weleda Skin Food Original — Intensive moisturizer, natural/organic, for dryness
- catalog_id:7 — NUXE Huile Prodigieuse — Multi-use dry oil for face/body/hair, for dryness/dullness
- catalog_id:8 — Moroccanoil Treatment Original — Argan oil hair treatment, for all hair types
- catalog_id:9 — Pai Rosehip BioRegenerate Oil — Organic rosehip oil, for aging/dark spots/dryness
- catalog_id:10 — REN Ready Steady Glow Tonic — AHA tonic, vegan, for dullness/pores/dark spots
- catalog_id:11 — Klorane Mango Butter Hair Mask — Natural/vegan hair mask, for curly/coily/wavy hair
`;

const REMEDY_CATALOG = `
Available natural remedies in the MASEYA library (use remedy_id when recommending):
- remedy_id:1 — Honey & Oatmeal Face Mask — Skin — hydrating, soothing, anti-inflammatory
- remedy_id:2 — Rosemary Oil Scalp Treatment — Hair — growth, strengthening, shine
- remedy_id:3 — Rice Water Rinse — Hair — shine, strength, detangling
- remedy_id:4 — Green Tea Toner — Skin — antioxidant, pore-refining, brightening
- remedy_id:5 — Avocado & Coconut Hair Mask — Hair — deep conditioning, repair, moisture
- remedy_id:6 — Collagen Smoothie — Nutrition — elasticity, anti-aging, glow
- remedy_id:7 — Turmeric Brightening Mask — Skin — brightening, anti-inflammatory, even tone
- remedy_id:8 — Biotin Breakfast Bowl — Nutrition — hair growth, nail strength, energy
`;

const COUNTRY_TO_MARKETPLACE: Record<string, { domain: string; suffix: string }> = {
  spain: { domain: "www.amazon.es", suffix: "es" },
  es: { domain: "www.amazon.es", suffix: "es" },
  españa: { domain: "www.amazon.es", suffix: "es" },
  france: { domain: "www.amazon.fr", suffix: "fr" },
  fr: { domain: "www.amazon.fr", suffix: "fr" },
  germany: { domain: "www.amazon.de", suffix: "de" },
  de: { domain: "www.amazon.de", suffix: "de" },
  deutschland: { domain: "www.amazon.de", suffix: "de" },
  italy: { domain: "www.amazon.it", suffix: "it" },
  it: { domain: "www.amazon.it", suffix: "it" },
  italia: { domain: "www.amazon.it", suffix: "it" },
  "united kingdom": { domain: "www.amazon.co.uk", suffix: "co.uk" },
  uk: { domain: "www.amazon.co.uk", suffix: "co.uk" },
};

function getMarketplace(country?: string): { domain: string; suffix: string } {
  if (!country) return { domain: "www.amazon.es", suffix: "es" };
  const key = country.toLowerCase().trim();
  return COUNTRY_TO_MARKETPLACE[key] || { domain: "www.amazon.es", suffix: "es" };
}

function buildAmazonSearchUrl(query: string, domain: string): string {
  return `https://${domain}/s?k=${encodeURIComponent(query)}`;
}

const RECOMMEND_TOOL = {
  type: "function" as const,
  function: {
    name: "recommend_products",
    description:
      "Recommend beauty products to the user. ALWAYS use this tool when suggesting products. Include catalog_id if the product is from the MASEYA catalog.",
    parameters: {
      type: "object",
      properties: {
        products: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Full product name" },
              brand: { type: "string", description: "Brand name" },
              search_query: { type: "string", description: "Amazon search query to find this product" },
              reason: { type: "string", description: "Brief reason why this product fits THIS user's specific profile (reference their concerns/goals directly)" },
              catalog_id: { type: "number", description: "If from MASEYA catalog, the catalog ID. Otherwise omit." },
            },
            required: ["title", "brand", "search_query", "reason"],
            additionalProperties: false,
          },
        },
        remedies: {
          type: "array",
          description: "Optional: natural remedy recommendations from the MASEYA library",
          items: {
            type: "object",
            properties: {
              title: { type: "string", description: "Remedy name" },
              category: { type: "string", description: "Skin, Hair, or Nutrition" },
              reason: { type: "string", description: "Brief reason why this remedy fits THIS user" },
              remedy_id: { type: "number", description: "If from MASEYA library, the remedy ID." },
            },
            required: ["title", "category", "reason"],
            additionalProperties: false,
          },
        },
      },
      required: ["products"],
      additionalProperties: false,
    },
  },
};

function buildSystemPrompt(userProfile: Record<string, unknown>): string {
  const lang = (userProfile?.language as string) || "en";

  const langInstruction =
    lang === "es"
      ? "Responde SIEMPRE en español (España). Usa un tono cálido y cercano."
      : lang === "fr"
        ? "Réponds TOUJOURS en français. Utilise un ton chaleureux et bienveillant."
        : "Always respond in English. Use a warm and friendly tone.";

  const skinConcerns = (userProfile.skinConcerns as string[]) || [];
  const hairType = (userProfile.hairType as string) || "";
  const hairConcerns = (userProfile.hairConcerns as string[]) || [];
  const goals = (userProfile.goals as string[]) || [];
  const sensitivities = (userProfile.sensitivities as string[]) || [];
  const climate = (userProfile.climateType as string) || "";

  const hasProfile = skinConcerns.length > 0 || hairType || goals.length > 0;

  const profileSummary = hasProfile
    ? `
THIS USER'S PROFILE (use this to personalize every response):
- Skin concerns: ${skinConcerns.join(", ") || "none specified"}
- Hair type: ${hairType || "not specified"}
- Hair concerns: ${hairConcerns.join(", ") || "none specified"}
- Goals: ${goals.join(", ") || "not specified"}
- Sensitivities: ${sensitivities.join(", ") || "none"}
- Climate: ${climate || "not specified"}

IMPORTANT: Reference the user's specific concerns in your answers. Don't give generic advice.
Example: Instead of "try a hydrating serum", say "Because your skin profile shows dryness, a hyaluronic acid serum would help restore moisture."
`
    : "User has not completed their profile yet. Encourage them to complete it for personalized advice.";

  return `You are Mira, the AI beauty expert of MASEYA — a personalized natural beauty app.

${langInstruction}

CORE BEHAVIOR:
- Be concise, expert, and practical
- No long introductions or filler text
- No generic phrases like "I'm here to help you"
- Sound like a premium consultant, not a chatbot
- Always focus on solving the user's problem fast

DETECT USER INTENT (CRITICAL):
There are TWO MODES. You MUST detect the correct one:

1) RECOMMENDATION MODE → user wants product suggestions
2) PRACTICAL MODE → user wants to DO something now (DIY, recipe, routine, how-to)

PRACTICAL MODE (HIGHEST PRIORITY):
Trigger if user says things like: "I have…", "what can I do now", "how to make", "give me a recipe", "before shower", "how do I apply", "I don't have…", "what can I use at home"

RULES FOR PRACTICAL MODE:
- DO NOT recommend products
- DO NOT use the recommend_products tool
- DO NOT suggest buying anything
- Use ONLY what the user has or common household ingredients

FORMAT FOR PRACTICAL MODE:
1. 1-line diagnosis
2. What to use (based on user's ingredients or common items)
3. Step-by-step instructions (clear + short)
4. What to avoid (if relevant)
Keep it fast and usable immediately.

RECOMMENDATION MODE:
Use ONLY when user is explicitly asking for product recommendations or suggestions.

FORMAT FOR RECOMMENDATION MODE:
1. 1-line diagnosis
2. 1 line explaining what they need
3. Call recommend_products tool (1-3 products max)
4. Optional 1 short actionable tip (max 1 sentence)

RULES FOR RECOMMENDATION MODE:
- Each product reason = 1 sentence tied to user's specific profile
- No repetition of product names
- No long explanations before cards

TONE:
- Professional, confident, expert
- Warm but NOT overly friendly
- Clear and direct
- Minimal emojis (optional, max 1-2 per response)

PERSONALIZATION:
- ALWAYS reference the user's profile directly
- Example: "Because your skin is dry and sensitive..." NOT "This is good for dry skin"

LENGTH:
- Maximum 2 short sentences BEFORE product cards or instructions
- Be as brief as possible

${profileSummary}

${PRODUCT_CATALOG}

${REMEDY_CATALOG}

CRITICAL RULES:
1. NEVER mix modes — if practical, no products; if recommending, use the tool
2. In RECOMMENDATION MODE, ALWAYS use the recommend_products tool — never list products as plain text
3. Keep text BEFORE cards/instructions to 1-2 sentences max
4. NEVER use these filler patterns:
   - "Dado que tu perfil indica..." / "Since your profile shows..." / "Based on your concerns..."
   - "He seleccionado..." / "I've selected..." / "Let me suggest..."
   - Any AI-like opener or filler
5. Prefer MASEYA catalog products (include catalog_id) but you can recommend any real product
6. Include 0-1 natural remedy if relevant, aligned with user profile
7. Recommend 1-3 products max — don't overwhelm
8. NO repetition, NO generic descriptions
9. Stay focused on skincare, haircare, natural beauty, and wellness
10. Never give medical advice — suggest seeing a dermatologist for serious concerns
11. Be as helpful as ChatGPT, as actionable as a premium consultant — drive user to take action`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, userProfile } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0 || messages.length > 50) {
      return new Response(JSON.stringify({ error: "Invalid messages array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== "string") {
        return new Response(JSON.stringify({ error: "Invalid message format" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (msg.content.length > 5000) {
        return new Response(JSON.stringify({ error: "Message too long" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = buildSystemPrompt(userProfile || {});
    const marketplace = getMarketplace((userProfile as Record<string, unknown>)?.country as string);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
          ],
          tools: [RECOMMEND_TOOL],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limit" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "payment_required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let toolCallArgs = "";
    let hasToolCall = false;

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let buf = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });

            let newlineIdx: number;
            while ((newlineIdx = buf.indexOf("\n")) !== -1) {
              let line = buf.slice(0, newlineIdx);
              buf = buf.slice(newlineIdx + 1);
              if (line.endsWith("\r")) line = line.slice(0, -1);
              if (!line.startsWith("data: ")) continue;

              const jsonStr = line.slice(6).trim();
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr);
                const choice = parsed.choices?.[0];
                if (!choice) continue;

                const content = choice.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(line + "\n\n"));
                }

                const tcDelta = choice.delta?.tool_calls?.[0];
                if (tcDelta) {
                  hasToolCall = true;
                  if (tcDelta.function?.arguments) {
                    toolCallArgs += tcDelta.function.arguments;
                  }
                }
              } catch {
                // partial JSON, skip
              }
            }
          }

          // Process tool call results
          if (hasToolCall && toolCallArgs) {
            try {
              const toolData = JSON.parse(toolCallArgs);
              const products = toolData.products || [];
              const remedyRecs = toolData.remedies || [];

              const enrichedProducts = products.map((p: { title: string; brand: string; search_query: string; reason: string; catalog_id?: number }) => ({
                title: p.title,
                brand: p.brand,
                amazon_url: buildAmazonSearchUrl(p.search_query, marketplace.domain),
                marketplace: `amazon.${marketplace.suffix}`,
                reason: p.reason,
                catalog_id: p.catalog_id || null,
              }));

              const enrichedRemedies = remedyRecs.map((r: { title: string; category: string; reason: string; remedy_id?: number }) => ({
                title: r.title,
                category: r.category,
                reason: r.reason,
                remedy_id: r.remedy_id || null,
              }));

              const productEvent = `data: ${JSON.stringify({
                type: "recommended_products",
                products: enrichedProducts,
                remedies: enrichedRemedies,
              })}\n\n`;
              controller.enqueue(encoder.encode(productEvent));
            } catch (e) {
              console.error("Failed to parse tool call args:", e, toolCallArgs);
            }
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (e) {
          console.error("Stream processing error:", e);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
