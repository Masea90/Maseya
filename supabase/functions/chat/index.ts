import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRODUCT_CATALOG = `
Available products in the MASEYA catalog:
1. Weleda Skin Food Original – Intensive moisturizer, natural/organic, for dryness & sensitivity, €12.95
2. Pai Skincare Rosehip BioRegenerate Oil – Organic rosehip oil, for aging/dark spots/dullness/dryness, €26.00
3. The Ordinary Niacinamide 10% + Zinc 1% – Vegan, for oiliness/acne/pores, €5.80
4. Olaplex No.7 Bonding Oil – Hair oil, vegan, for all hair types, €28.00
5. CeraVe Hydrating Cleanser – Gentle cleanser with ceramides, for dryness/sensitivity, €9.50
6. Klorane Mango Butter Hair Mask – Natural/vegan hair mask, for curly/coily/wavy hair, €12.90
7. NUXE Huile Prodigieuse – Multi-use dry oil for face/body/hair, natural, for dryness/dullness, €29.90
8. REN Ready Steady Glow Tonic – AHA tonic, natural/vegan, for dullness/pores/dark spots, €32.00
9. Moroccanoil Treatment Original – Argan oil hair treatment, for all hair types, €34.85
`;

// Map user country to Amazon marketplace
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
  const encoded = encodeURIComponent(query);
  return `https://${domain}/s?k=${encoded}`;
}

const RECOMMEND_TOOL = {
  type: "function" as const,
  function: {
    name: "recommend_products",
    description:
      "Recommend beauty/skincare/haircare products to the user. Use this whenever you want to suggest specific products. Generate real product search queries for Amazon.",
    parameters: {
      type: "object",
      properties: {
        products: {
          type: "array",
          description: "List of product recommendations",
          items: {
            type: "object",
            properties: {
              title: {
                type: "string",
                description: "Full product name, e.g. 'CeraVe Hydrating Facial Cleanser 473ml'",
              },
              brand: {
                type: "string",
                description: "Brand name, e.g. 'CeraVe'",
              },
              search_query: {
                type: "string",
                description:
                  "Exact Amazon search query to find this product, e.g. 'CeraVe Hydrating Facial Cleanser'",
              },
              reason: {
                type: "string",
                description:
                  "Brief reason why this product is recommended for this user (1 sentence)",
              },
            },
            required: ["title", "brand", "search_query", "reason"],
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

  const profileSummary = userProfile
    ? `
User Profile:
- Skin concerns: ${(userProfile.skinConcerns as string[])?.join(", ") || "not set"}
- Hair type: ${(userProfile.hairType as string) || "not set"}
- Hair concerns: ${(userProfile.hairConcerns as string[])?.join(", ") || "not set"}
- Goals: ${(userProfile.goals as string[])?.join(", ") || "not set"}
- Age range: ${(userProfile.ageRange as string) || "not set"}
- Sensitivities: ${(userProfile.sensitivities as string[])?.join(", ") || "none"}
- Country: ${(userProfile.country as string) || "not set"}
- Climate: ${(userProfile.climateType as string) || "not set"}
`
    : "User has not completed their profile yet.";

  return `You are Mira, the friendly and knowledgeable beauty assistant for the MASEYA app. MASEYA is a personalized natural beauty platform for skincare, haircare, and self-care.

${langInstruction}

Your personality:
- Warm, supportive, and encouraging — like a knowledgeable friend
- Use occasional emojis (🌿 💧 ✨ 🌸 💇‍♀️) but don't overdo it
- Give practical, actionable advice
- Keep responses concise (2-4 short paragraphs max)
- Never give medical advice — if someone describes a serious condition, kindly suggest they see a dermatologist

${profileSummary}

${PRODUCT_CATALOG}

Product recommendation guidelines:
- When the user asks for product recommendations, ALWAYS use the recommend_products tool
- You can recommend products from the MASEYA catalog above AND any real product you know exists
- For each product, provide the exact product name, brand, and a search query that would find it on Amazon
- Recommend 2-5 products per request, matching the user's profile
- Mention WHY each product is a good match in the reason field
- In your text response, briefly introduce the recommendations but don't list all details — the tool will render product cards
- Stay focused on skincare, haircare, natural beauty, and wellness
- If the user asks about topics outside beauty/wellness, gently redirect
- If the user's profile is incomplete, encourage them to complete it for better recommendations`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication ---
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

    // --- Input Validation ---
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

    // --- AI Call ---
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

    // Stream the response, capturing tool calls along the way
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    let toolCallArgs = "";
    let hasToolCall = false;
    let textBuffer = "";

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

                // Text content — forward to client
                const content = choice.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(line + "\n\n"));
                }

                // Tool call arguments — accumulate
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

          // If there was a tool call, parse it and send product recommendations as a custom SSE event
          if (hasToolCall && toolCallArgs) {
            try {
              const toolData = JSON.parse(toolCallArgs);
              const products = toolData.products || [];

              // Build Amazon search URLs for each product
              const enrichedProducts = products.map((p: { title: string; brand: string; search_query: string; reason: string }) => ({
                title: p.title,
                brand: p.brand,
                amazon_url: buildAmazonSearchUrl(p.search_query, marketplace.domain),
                marketplace: `amazon.${marketplace.suffix}`,
                reason: p.reason,
              }));

              const productEvent = `data: ${JSON.stringify({
                type: "recommended_products",
                products: enrichedProducts,
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
