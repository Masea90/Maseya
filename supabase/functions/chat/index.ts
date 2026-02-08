import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product catalog summary for Mira's knowledge
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
- When recommending products, mention them by name from the MASEYA catalog below
- Never give medical advice — if someone describes a serious condition, kindly suggest they see a dermatologist

${profileSummary}

${PRODUCT_CATALOG}

Guidelines:
- Personalize every response using the user's profile data above
- When recommending products, pick ones that match the user's concerns, hair type, and goals
- Mention WHY a product is a good match (e.g., "Since you have dry skin, Weleda Skin Food would be perfect")
- You can suggest natural remedies and DIY tips alongside product recommendations
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
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "rate_limit" }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "payment_required" }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "ai_error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(response.body, {
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
