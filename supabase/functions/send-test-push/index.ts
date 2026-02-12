import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Allowed origins — add your custom domain here if needed
const ALLOWED_ORIGINS = [
  "https://www.maseya.es",
  "https://maseya.es",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Vary": "Origin",
  };
}

// In-memory per-user rate limit: 1 request per 30 seconds
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30_000;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ── Auth via getClaims ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing authorization" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return json({ error: "Unauthorized" }, 401);
    }
    const userId = claimsData.claims.sub as string;

    // ── Rate limit (per-user, 30s cooldown) ──
    const now = Date.now();
    const lastCall = rateLimitMap.get(userId);
    if (lastCall && now - lastCall < RATE_LIMIT_MS) {
      const waitSec = Math.ceil((RATE_LIMIT_MS - (now - lastCall)) / 1000);
      return json({ error: `Rate limited. Try again in ${waitSec}s.` }, 429);
    }
    rateLimitMap.set(userId, now);

    // Evict stale entries to prevent memory growth
    if (rateLimitMap.size > 500) {
      for (const [key, ts] of rateLimitMap) {
        if (now - ts > RATE_LIMIT_MS * 2) rateLimitMap.delete(key);
      }
    }

    // ── Fetch subscriptions ──
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", userId);

    if (subError) throw subError;

    if (!subscriptions || subscriptions.length === 0) {
      return json(
        { error: "No push subscriptions found. Enable notifications first." },
        404,
      );
    }

    // ── VAPID keys ──
    const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return json(
        {
          error: "VAPID keys not configured.",
          setup: "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY secrets.",
        },
        500,
      );
    }

    // ── Build payload ──
    let title = "MASEYA Test";
    let message = "Push notifications are working! 🎉";
    try {
      const body = await req.json();
      if (body.title) title = String(body.title).slice(0, 200);
      if (body.message) message = String(body.message).slice(0, 500);
    } catch {
      // use defaults
    }

    const payload = JSON.stringify({ title, message, url: "/" });

    // ── Send via web-push ──
    const webPush = await import("https://esm.sh/web-push@3.6.7");
    webPush.setVapidDetails(
      "mailto:hello@maseya.app",
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY,
    );

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webPush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        ),
      ),
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    return json({ success: true, sent, failed, total: subscriptions.length });
  } catch (error) {
    console.error("send-test-push error:", error);
    return json({ error: error.message || "Internal server error" }, 500);
  }
});
