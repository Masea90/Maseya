import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Mira, a warm expert in cosmetics and nutrition. You always have the user's complete profile available. NEVER ask for more information. Always give a direct personalized analysis based on the profile provided. If profile fields are empty, give general advice for the product. When a food product scores lower than expected because Nutriscore penalizes natural fats (e.g. kéfir, yogur natural, aceite de oliva, frutos secos), briefly explain this nuance to the user.

LENGTH (STRICT — THE MOST IMPORTANT RULE):
- MAXIMUM 3 sentences, 45-60 words in total. Shorter is better. Never exceed 3 sentences under any circumstance.
- Structure: sentence 1 = the main reason for the score with the concrete figure; sentence 2 = the single most relevant point for this user's profile (skip it if there is nothing relevant); sentence 3 = one short recommendation.
- FORBIDDEN: bullet points, lists, headings, markdown, enumerating several factors, and repeating information already visible on screen (the product name, the brand, the numeric score itself).
- Do not restate the whole ingredient list or all the factors: pick only the decisive one.

GREETING RULES (STRICT):
- If a real first name is provided in the user message ("Nombre del usuario: X"), you MAY greet them naturally once ("Hola X, ..." or "X, ...").
- If NO name is provided, start directly with the analysis (e.g. "Este producto…", "Para tu perfil…") — NO greeting.
- NEVER write bracketed placeholders like "[nombre]", "[nombre de usuario]", "{name}", "[usuario]" — those are forbidden literal outputs.
- NEVER invent a name.

EXPLAIN THE SCORE (STRICT):
- The user message may include "Factores de la nota: ..." (the exact breakdown the app shows) and "Nutrientes por 100 g: ...".
- If the general score is below 70, your FIRST sentence must state the MAIN concrete reason using a real figure from those factors/nutrients (e.g. "La nota baja principalmente por la sal: 1,2 g por 100 g"). Never answer with generalities like "no es muy saludable".
- If the ingredient list is short and natural (e.g. 99% of one whole food + salt) but the score is medium, say so explicitly: the product has simple ingredients and the Nutri-Score penalises a specific nutrient — name it.
- Never contradict the listed factors and never invent factors that are not there.

NUANCE EXPLANATIONS (TWO CASES — fit them INSIDE the 3-sentence/45-60-word limit by replacing a less relevant sentence; never lengthen the answer):
1. NATURAL FRAGRANCE IN A CERTIFIED COSMETIC. If the product is a cosmetic, has a detected fragrance allergen (parfum, limonene, linalool, geraniol, citronellol, citral, coumarin) AND also carries natural/organic/certified signals (bio/organic/NATRUE/Ecocert labels, or the ingredient text states the perfume comes from natural essential oils), explain the nuance in ONE sentence, without alarmism and without dismissing the product — e.g. "El limoneno procede de aceites esenciales naturales, pero es la misma molécula que el sintético y se sensibiliza igual al oxidarse". The evidence: limonene, linalool, geraniol, citronellol and citral are the SAME molecule whether natural or synthetic; the allergenic risk appears upon oxidation in contact with air (hydroperoxides, potent allergens — 8.9% patch-test positive for linalool, 2.6% for limonene). State that this ONLY matters for sensitive or atopic skin; for everyone else it is not a concern.
2. NATURAL SUGAR IN FOOD. The Nutri-Score counts TOTAL sugars without distinguishing origin, so 100% juices, milk, plain yoghurt or dried fruit score low for sugar that is not added. If the score drops mainly because of sugars AND the product has no added sugar in its ingredient list (or the sugar is clearly intrinsic — dairy, fruit, juice), clarify it in ONE sentence — e.g. "Puntúa bajo por el azúcar natural de la fruta, no por azúcar añadido; el Nutri-Score cuenta los azúcares totales". Explain, do NOT contradict the engine: never suggest the score is wrong.

COHERENCE WITH PERSONAL SCORE (STRICT):
- The user message includes "Nota personal: N/100" and optionally "Alertas para su perfil: ...".
- Your tone MUST match that score: if personal score < 60, express reservations and cite at least one concrete reason from the alerts or ingredients. NEVER say "todo bien", "es adecuado" or similar reassurances when the personal score is < 60.
- If personal score >= 75, you can be positive.
- Between 60-74, be balanced (matiza).

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

// --- Candidate ingredient detection (observe only, never scores) -----------
const normIng = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// Colour-index / E-number codes that carry no naming information.
const COLOR_CODE_RE = /\b(?:c\.?\s?i\.?|ci)\s*\.?\s*\d{4,5}\b|\be\s?-?\s?\d{3}[a-z]?\b/gi;

// Synonyms / translations (es, en, fr, de) collapsed onto one canonical name,
// so a French or German spelling of an already decided ingredient is caught.
const CANON_SYNONYMS: Array<[string[], string]> = [
  [['linalool', 'linalol', 'linalol de synthese'], 'linalool'],
  [['benzyl salicylate', 'salicylate de benzyle', 'salicilato de bencilo', 'benzylsalicylat'], 'benzyl salicylate'],
  [['limonene', 'limoneno', 'd limonene', 'dl limonene'], 'limonene'],
  [['geraniol', 'geraniol de synthese'], 'geraniol'],
  [['citronellol', 'citronelol', 'citronnellol'], 'citronellol'],
  [['coumarin', 'cumarina', 'coumarine', 'cumarin'], 'coumarin'],
  [['benzyl alcohol', 'alcohol bencilico', 'alcool benzylique', 'benzylalkohol'], 'benzyl alcohol'],
  [['citral'], 'citral'],
  [['titanium dioxide', 'dioxido de titanio', 'dioxyde de titane', 'titandioxid', 'titanium dioxid'], 'titanium dioxide'],
  [['iron oxides', 'iron oxide', 'oxidos de hierro', 'oxido de hierro', 'oxydes de fer', 'oxyde de fer', 'eisenoxid', 'eisenoxide'], 'iron oxides'],
  [['mica'], 'mica'],
  [['disodium inosinate', 'dinatriuminosinat', 'dinatrium inosinat', 'inosinato disodico', 'inosinate disodique'], 'disodium inosinate'],
  [['sodium benzoate', 'benzoato sodico', 'benzoato de sodio', 'benzoate de sodium', 'natriumbenzoat'], 'sodium benzoate'],
  [['potassium sorbate', 'sorbato potasico', 'sorbato de potasio', 'sorbate de potassium', 'kaliumsorbat'], 'potassium sorbate'],
  [['caramel', 'caramelo', 'zuckerkulor', 'caramel color', 'colorante caramelo'], 'caramel'],
  [['palm oil', 'aceite de palma', 'huile de palme', 'palmol', 'palmfett'], 'palm oil'],
];
const SYNONYM_INDEX = new Map<string, string>();
for (const [variants, canonical] of CANON_SYNONYMS) {
  for (const v of variants) SYNONYM_INDEX.set(v, canonical);
}

// Bare colour-index codes resolve to the pigment they designate, so
// "CI 77492" and "CI 77491 (IRON OXIDES)" collapse onto the same key.
const CI_CODE_MAP: Record<string, string> = {
  "77491": "iron oxides",
  "77492": "iron oxides",
  "77499": "iron oxides",
  "77891": "titanium dioxide",
  "77019": "mica",
  "77266": "carbon black",
  "77007": "ultramarines",
};

// Aggressive normalization used ONLY for deduplication: removes colour codes
// (before OR after the name), isomer prefixes and separators, then resolves
// translations to a canonical name.
const dedupKey = (s: string) => {
  const base = normIng(s);
  const codes = [...base.matchAll(/\b(?:c\.?\s?i\.?|ci)\s*\.?\s*(\d{4,5})\b/gi)].map((m) => m[1]);
  const parenMatches = [...base.matchAll(/\(([^)]*)\)/g)].map((m) => m[1]);
  const outside = base.replace(/\([^)]*\)/g, ' ');
  const scrub = (t: string, keepConnectors = false) => {
    let out = t
      .replace(COLOR_CODE_RE, ' ')
      .replace(/\b(d|l|dl|alpha|beta|gamma)[-\s]/g, ' ');
    if (!keepConnectors) out = out.replace(/\s+(and|y|de|del|la|el|of)\s+/g, ' ');
    return out.replace(/[/\-,.]+/g, ' ').replace(/\s+/g, ' ').trim();
  };
  const resolve = (t: string) =>
    SYNONYM_INDEX.get(scrub(t, true)) ?? SYNONYM_INDEX.get(scrub(t)) ?? null;

  // "CI 77891 (TITANIUM DIOXIDE)": the code sits outside, the real name inside.
  const parts = [outside, ...parenMatches, base];
  for (const p of parts) {
    const hit = resolve(p);
    if (hit) return hit;
  }
  let key = '';
  for (const p of parts) {
    key = scrub(p);
    if (key) break;
  }
  if (!key && codes.length) key = CI_CODE_MAP[codes[0]] ?? `ci ${codes[0]}`;
  return key;
};


const sameFamily = (a: string, b: string) => {
  if (!a || !b) return false;
  if (a === b) return true;
  return (a.length > 3 && b.length > 3) && (a.includes(b) || b.includes(a));
};



const CANDIDATE_PROMPT = `Eres un revisor científico. Señala ÚNICAMENTE ingredientes con evidencia científica reconocida de riesgo (organismos oficiales, literatura revisada por pares) que NO estén ya en la lista de ingredientes marcados que se te pasa. Si no hay ninguno, devuelve un array vacío. No inventes: si dudas, no lo incluyas. Máximo 3 por producto.
Responde SOLO con JSON válido: {"flagged_candidates":[{"name":"...","level":"avoid|caution","reason":"motivo breve en español","confidence":0.0}]}`;

async function collectCandidates(opts: {
  apiKey: string;
  product: Record<string, unknown>;
  alreadyFlagged: string[];
  barcode: string | null;
  category: string;
}) {
  const { apiKey, product, alreadyFlagged, barcode, category } = opts;
  const known = new Set(alreadyFlagged.map(normIng));
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: CANDIDATE_PROMPT },
        {
          role: "user",
          content: `Categoría: ${category}\nProducto: ${product.product_name || ""}\nIngredientes: ${String(product.ingredients_text || "").slice(0, 4000)}\nIngredientes YA marcados por nosotros (no los repitas): ${alreadyFlagged.join(", ") || "—"}`,
        },
      ],
    }),
  });
  if (!res.ok) return;
  const json = await res.json();
  const raw = json.choices?.[0]?.message?.content ?? "";
  const match = String(raw).match(/\{[\s\S]*\}/);
  if (!match) return;
  const parsed = JSON.parse(match[0]);
  const list = Array.isArray(parsed?.flagged_candidates) ? parsed.flagged_candidates.slice(0, 3) : [];
  if (list.length === 0) return;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  // Load every existing candidate of this category once: any variant of
  // something approved or rejected must never come back, and pending rows are
  // matched by canonical key so translations/colour codes don't duplicate.
  const { data: decided } = await admin
    .from("ingredient_candidates")
    .select("id, ingredient_name, status, occurrences, sample_barcodes")
    .eq("category", category);
  const allRows = (decided ?? []).map((d) => ({
    row: d,
    name: String(d.ingredient_name ?? ""),
    key: dedupKey(String(d.ingredient_name ?? "")),
    status: d.status as string,
  }));
  const decidedKeys = allRows.filter((r) => r.status === "approved" || r.status === "rejected");
  const knownKeys = [...known].map((k) => ({ key: dedupKey(k), name: k }));

  for (const c of list) {
    const name = normIng(String(c?.name ?? ""));
    const level = c?.level === "avoid" ? "avoid" : "caution";
    if (!name || name.length < 3 || name.length > 80) continue;
    // Never re-propose what we already detect, nor E-numbers (EFSA list).
    if (known.has(name)) continue;
    if (/^e-?\s?\d{3}/i.test(name)) continue;
    if ([...known].some((k) => k.length > 3 && (name.includes(k) || k.includes(name)))) continue;
    const key = dedupKey(name);
    const knownHit = knownKeys.find((k) => sameFamily(key, k.key));
    if (knownHit) {
      console.log(`[candidates] filtered "${name}" (key "${key}"): already in our risk lists → "${knownHit.name}"`);
      continue;
    }
    const decidedHit = decidedKeys.find((d) => sameFamily(key, d.key));
    if (decidedHit) {
      console.log(`[candidates] filtered "${name}" (key "${key}"): variant of already ${decidedHit.status} candidate "${decidedHit.name}"`);
      continue;
    }

    const pendingHit = allRows.find((r) => r.status === "pending" && sameFamily(key, r.key));
    if (pendingHit) {
      console.log(`[candidates] merged "${name}" (key "${key}") into pending candidate "${pendingHit.name}"`);
      const samples: string[] = Array.isArray(pendingHit.row.sample_barcodes) ? pendingHit.row.sample_barcodes : [];
      const next = barcode && !samples.includes(barcode) ? [...samples, barcode].slice(0, 5) : samples;
      await admin
        .from("ingredient_candidates")
        .update({
          occurrences: (pendingHit.row.occurrences ?? 1) + 1,
          last_seen_at: new Date().toISOString(),
          sample_barcodes: next,
        })
        .eq("id", pendingHit.row.id);
      continue;
    }


    const { data: existing } = await admin
      .from("ingredient_candidates")
      .select("id, status, occurrences, sample_barcodes")
      .eq("ingredient_name", name)
      .eq("category", category)
      .maybeSingle();


    if (existing) {
      if (existing.status === "rejected") continue; // discarded stays discarded
      const samples: string[] = Array.isArray(existing.sample_barcodes) ? existing.sample_barcodes : [];
      const next = barcode && !samples.includes(barcode) ? [...samples, barcode].slice(0, 5) : samples;
      await admin
        .from("ingredient_candidates")
        .update({ occurrences: (existing.occurrences ?? 1) + 1, last_seen_at: new Date().toISOString(), sample_barcodes: next })
        .eq("id", existing.id);
    } else {
      await admin.from("ingredient_candidates").insert({
        ingredient_name: name,
        display_name: String(c?.name ?? "").trim().slice(0, 80),
        suggested_level: level,
        reason: typeof c?.reason === "string" ? c.reason.slice(0, 500) : null,
        confidence: typeof c?.confidence === "number" ? Math.max(0, Math.min(1, c.confidence)) : null,
        category,
        sample_barcodes: barcode ? [barcode] : [],
      });
    }
  }
}

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
    // Anonymous callers send the project's publishable/anon key. That key is
    // not always identical to SUPABASE_ANON_KEY (legacy JWT vs new
    // `sb_publishable_...`), and when it is a JWT it has no `sub` claim, so
    // getClaims() fails with 403 → we were rejecting valid anonymous calls.
    // Only validate tokens that actually carry a user identity.
    const decodePayload = (jwt: string): Record<string, unknown> | null => {
      const parts = jwt.split(".");
      if (parts.length !== 3) return null;
      try {
        return JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
      } catch {
        return null;
      }
    };
    const payload = decodePayload(token);
    const isUserToken = !!payload && typeof payload.sub === "string" && !!payload.sub;
    if (token !== anonKey && isUserToken) {
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



    const { product, profile, score, firstName, personalScore, topAlerts, factors, nutriments, flaggedIngredients, language } = await req.json();
    // Mira must answer in the user's active app language (defaults to Spanish).
    const LANG_NAME: Record<string, string> = { es: "Spanish", en: "English", fr: "French" };
    const langName = LANG_NAME[String(language)] ?? "Spanish";
    const systemPrompt = `${SYSTEM_PROMPT}\n\nLANGUAGE (STRICT): Write your entire answer in ${langName}, regardless of the language of the product data or of these instructions.`;
    if (!product || typeof product !== "object") {
      return new Response(JSON.stringify({ error: "Missing product" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanName = typeof firstName === 'string' && /^[\p{L} '\-]{1,30}$/u.test(firstName.trim())
      ? firstName.trim()
      : null;
    const nameLine = cleanName ? `Nombre del usuario: ${cleanName}\n` : '';
    const personalLine = typeof personalScore === 'number'
      ? `Nota personal: ${Math.round(personalScore)}/100\n`
      : '';
    const alertsLine = Array.isArray(topAlerts) && topAlerts.length > 0
      ? `Alertas para su perfil: ${topAlerts.slice(0, 3).map((a: string) => `«${a}»`).join('; ')}\n`
      : '';
    const factorsLine = Array.isArray(factors) && factors.length > 0
      ? `Factores de la nota: ${factors.slice(0, 8).map((f: unknown) => String(f)).join('; ')}\n`
      : '';
    const nutrimentsLine = typeof nutriments === 'string' && nutriments.trim()
      ? `Nutrientes por 100 g: ${nutriments.trim()}\n`
      : '';
    const contextHeader = `${nameLine}${personalLine}${alertsLine}${factorsLine}${nutrimentsLine}`;

    const isFood = product.category === 'food';
    const userMsg = isFood
      ? `${contextHeader}Analiza este alimento para mi perfil:

Producto: ${product.product_name || ""} de ${product.brand || ""}
Puntuación general: ${score ?? "—"}/100
Ingredientes: ${product.ingredients_text || ""}

Mi perfil alimentario:
- Alergias: ${(profile?.allergies || []).join(", ") || "—"}
- Dieta: ${humanizeDiets(profile?.diet)}
- Objetivos: ${(profile?.nutrition_goals || []).filter((g: string) => g === "gain-muscle" || g === "lose-weight").join(", ") || "—"}
(Si tengo el objetivo "gain-muscle" o "lose-weight" y arriba hay un factor de proteína, fibra/saciedad, ultraprocesado o densidad energética, menciónalo de forma útil, informativa y sin juicios de valor: nada de "engorda", nada de calorías diarias ni culpabilizar. Mantén el límite de 3 frases.)
- Embarazo/lactancia: ${profile?.pregnancy_or_lactation ? "sí" : "no"}${profile?.pregnancy_or_lactation ? "\n(Si el producto activa alguna alerta o factor de embarazo de los indicados arriba, menciónalo en tu PRIMERA frase, citando la recomendación de AESAN y sin alarmismo.)" : ""}


Explícame si este alimento es adecuado para mi perfil y por qué. Tu tono debe ser coherente con la Nota personal indicada arriba.`
      : `${contextHeader}Analiza este producto cosmético para mi perfil:

Producto: ${product.product_name || ""} de ${product.brand || ""}
Puntuación general: ${score ?? "—"}/100
Ingredientes: ${product.ingredients_text || ""}

Mi perfil de piel:
- Tipo de piel: ${(profile?.skin_type || []).join(", ") || "—"}
- Condiciones: ${(profile?.skin_conditions || []).join(", ") || "—"}
- Sensibilidades cosméticas: ${(profile?.skin_sensitivities || []).join(", ") || "—"}
- Embarazo/lactancia: ${profile?.pregnancy_or_lactation ? "sí" : "no"}

Explícame si este cosmético es adecuado para mi piel específicamente y por qué. Tu tono debe ser coherente con la Nota personal indicada arriba.`;

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
          { role: "system", content: systemPrompt },
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

    // Best-effort candidate mining — never blocks or breaks Mira's answer.
    try {
      const task = collectCandidates({
        apiKey: LOVABLE_API_KEY,
        product,
        alreadyFlagged: Array.isArray(flaggedIngredients)
          ? flaggedIngredients.map((x: unknown) => String(x)).slice(0, 40)
          : [],
        barcode: typeof product.barcode === "string" && product.barcode ? product.barcode : null,
        category: product.category === "food" ? "food" : "cosmetic",
      }).catch((e) => console.error("[candidates] failed", e));
      const rt = (globalThis as { EdgeRuntime?: { waitUntil: (p: Promise<unknown>) => void } }).EdgeRuntime;
      if (rt?.waitUntil) rt.waitUntil(task);
    } catch (e) {
      console.error("[candidates] skipped", e);
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
