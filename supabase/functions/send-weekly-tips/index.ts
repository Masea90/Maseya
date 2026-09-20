// Weekly "did you know" push tips.
// Runs once a week from a scheduled job. Hard cap: one notification per user
// per 6 days, rotating through active tips without repeating until exhausted.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // V2 pair is the valid one; the original stored private key was malformed.
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY_V2") ?? Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY_V2") ?? Deno.env.get("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) return json({ error: "VAPID keys not configured" }, 500);
  webpush.setVapidDetails("mailto:hola@maseya.es", publicKey, privateKey);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: tips } = await supabase
    .from("push_tips")
    .select("id, title, body, url")
    .eq("active", true);

  if (!tips || tips.length === 0) return json({ sent: 0, reason: "no_active_tips" });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("enabled", true);

  if (!subs || subs.length === 0) return json({ sent: 0, reason: "no_subscriptions" });

  // Weekly cap: users who already got a tip in the last 6 days are skipped.
  const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await supabase
    .from("push_sends")
    .select("user_id")
    .gte("sent_at", since);
  const recentUsers = new Set((recent ?? []).map((r) => r.user_id));

  // Rotation history: what each user has already received, ever.
  const { data: history } = await supabase.from("push_sends").select("user_id, tip_id");
  const seen = new Map<string, Set<string>>();
  for (const row of history ?? []) {
    if (!seen.has(row.user_id)) seen.set(row.user_id, new Set());
    seen.get(row.user_id)!.add(row.tip_id);
  }

  // One subscription per user (the most recent row wins) to avoid duplicates.
  const byUser = new Map<string, typeof subs[number]>();
  for (const s of subs) if (!byUser.has(s.user_id)) byUser.set(s.user_id, s);

  let sent = 0;
  let skipped = 0;
  let removed = 0;

  for (const [userId, sub] of byUser) {
    if (recentUsers.has(userId)) { skipped++; continue; }

    const already = seen.get(userId) ?? new Set<string>();
    let pool = tips.filter((t) => !already.has(t.id));
    if (pool.length === 0) pool = tips; // list exhausted → start over
    const tip = pool[Math.floor(Math.random() * pool.length)];

    const payload = JSON.stringify({
      title: tip.title,
      body: tip.body,
      url: tip.url || "/scan",
      tip_id: tip.id,
    });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
      await supabase.from("push_sends").insert({ user_id: userId, tip_id: tip.id, status: "sent" });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // Expired subscription — clean it up so we stop trying.
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        removed++;
      } else {
        console.error("[weekly-tips] send failed", status, (e as Error).message);
      }
    }
  }

  return json({ sent, skipped, removed, subscriptions: byUser.size });
});
