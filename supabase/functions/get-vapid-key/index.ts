import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Must match the private key used by send-weekly-tips (V2 pair).
  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY_V2") ?? Deno.env.get("VAPID_PUBLIC_KEY");

  if (!vapidPublicKey) {
    return new Response(
      JSON.stringify({ error: "VAPID_PUBLIC_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ key: vapidPublicKey }),
    { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-cache, no-store, must-revalidate" } },
  );
});
