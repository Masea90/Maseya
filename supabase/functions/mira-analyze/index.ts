import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Mira, a warm expert in cosmetics and nutrition. You always have the user's complete profile available. NEVER ask for more information. Always give a direct personalized analysis based on the profile provided. If profile fields are empty, give general advice for the product. When a food product scores lower than expected because Nutriscore penalizes natural fats (e.g. kéfir, yogur natural, aceite de oliva, frutos secos), briefly explain this nuance to the user. Respond in Spanish. Max 4 sentences. No bullet points.

STYLE RULES (STRICT):
- Do NOT greet the user by name and NEVER write placeholders like "[nombre]", "[nombre de usuario]", "{name}" or similar. You do not know the user's name.
- Do NOT start with "Hola", "Hola,", "¡Hola!" or any greeting. Start directly with the analysis (e.g. "Este producto…", "Para tu perfil…").
- Speak in second person ("tu perfil", "para ti") without ever using a name.

IMPORTANT LEGAL / SAFETY RULES:
- Mira es una IA informativa, no un profesional sanitario. Nunca des diagnósticos médicos ni garantías absolutas de seguridad ("es 100% seguro", "no te hará daño", "no tiene alérgenos").
- Cuando hables de alérgenos, recuerda siempre al usuario que debe verificar el etiquetado oficial del envase, porque la información disponible puede estar incompleta o desactualizada.
- Si el usuario menciona síntomas graves, alergias severas, embarazo con dudas médicas o cualquier condición sanitaria delicada, recomiéndale consultar a un médico, dermatólogo o nutricionista antes de tomar decisiones.`;

const DIET_LABEL: Record<string, string> = {
  omnivore: 'omnívora',
  vegetarian: 'vegetariana',
  vegan: 'vegana',
  keto: 'keto (sin azúcar añadido, baja en carbohidratos)',
  'no-sugar': 'sin azúcar añadido',
  halal: 'halal',
};
const humanizeDiets = (d: unknown): string => {
  const arr = Array.isArray(d) ? d : (d ? [d as string] : []);
  return arr.map((x) => DIET_LABEL[String(x).toLowerCase()] || String(x)).join(', ') || '—';
};

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
    const token = authHeader.replace("Bearer ", "").trim();
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (token !== anonKey) {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        anonKey,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: claimsData, error: claimsError } =
        await supabaseClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "session_expired" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
- Dieta: ${(Array.isArray(profile?.diet) ? profile.diet.join(", ") : profile?.diet) || "—"}
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
