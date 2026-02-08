import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, category } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a content moderator for MASEYA, a natural beauty and skincare community app. 
Your job is to determine if a community post is appropriate for the app.

ALLOWED content (approve):
- Skincare routines, tips, experiences
- Hair care discussions
- Natural/bio/vegan beauty products
- Personal beauty experiences and results
- Questions about ingredients, products, routines
- Self-care and wellness related to beauty
- General supportive messages within the beauty community

NOT ALLOWED content (flag):
- Content completely unrelated to beauty/skincare/haircare/wellness
- Spam, advertising, or promotional content not related to beauty
- Hate speech, harassment, or toxic content
- Explicit/inappropriate content
- Political or religious propaganda
- Scams or suspicious links

Respond with a JSON object with exactly these fields:
- "approved": boolean (true if content is appropriate)
- "reason": string (brief explanation in the language of the post, max 100 chars)

Be lenient with borderline cases — only flag clearly inappropriate content.`
          },
          {
            role: "user",
            content: `Post category: ${category || 'general'}\nPost content: ${content}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "moderate_content",
              description: "Return moderation decision for a community post",
              parameters: {
                type: "object",
                properties: {
                  approved: { type: "boolean", description: "Whether the post is appropriate for the beauty community" },
                  reason: { type: "string", description: "Brief explanation of the decision" }
                },
                required: ["approved", "reason"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "moderate_content" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // If AI fails, default to approved (don't block users)
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ approved: true, reason: "Moderation unavailable" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    
    // Extract from tool call response
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: approve if we can't parse
    return new Response(JSON.stringify({ approved: true, reason: "Could not parse moderation result" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Moderation error:", e);
    // Default to approved on error — don't block users
    return new Response(JSON.stringify({ approved: true, reason: "Moderation error" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
