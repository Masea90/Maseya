import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Mira, a warm expert in cosmetics and nutrition. You always have the user's complete profile available. NEVER ask for more information. Always give a direct personalized analysis based on the profile provided. If profile fields are empty, give general advice for the product. Respond in Spanish. Max 4 sentences. No bullet points.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const { data: claimsData, error: claimsError } =
      await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { product, profile, score } = await req.json();
    if (!product || typeof product !== "object") {
      return new Response(JSON.stringify({ error: "Missing product" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFood = product.category === 'food';
    const userMsg = isFood
      ? `Analiza este alimento para mi perfil:

Producto: ${product.product_name || ""} de ${product.brand || ""}
Puntuación: ${score ?? "—"}/100
Ingredientes: ${product.ingredients_text || ""}

Mi perfil alimentario:
- Alergias: ${(profile?.allergies || []).join(", ") || "—"}
- Dieta: ${profile?.diet || "—"}
- Objetivos: ${(profile?.nutrition_goals || []).join(", ") || "—"}

Explícame si este alimento es adecuado para mi perfil y por qué.`
      : `Analiza este producto cosmético para mi perfil:

Producto: ${product.product_name || ""} de ${product.brand || ""}
Puntuación: ${score ?? "—"}/100
Ingredientes: ${product.ingredients_text || ""}

Mi perfil de piel:
- Tipo de piel: ${(profile?.skin_type || []).join(", ") || "—"}
- Condiciones: ${(profile?.skin_conditions || []).join(", ") || "—"}
- Sensibilidades cosméticas: ${(profile?.skin_sensitivities || []).join(", ") || "—"}
- Embarazo/lactancia: ${profile?.pregnancy_or_lactation ? "sí" : "no"}

Explícame si este cosmético es adecuado para mi piel específicamente y por qué.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const t = await upstream.text();
      console.error("AI gateway error:", upstream.status, t);
      const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 500;
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("mira-analyze internal error:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
