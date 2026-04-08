import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webPush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Test mode: send a test push to a specific user ──
    let testUserId: string | null = null;
    try {
      const body = await req.json();
      testUserId = body?.test_user_id || null;
    } catch { /* no body */ }

    if (testUserId) {
      const { data: subs } = await supabase
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", testUserId);

      if (!subs || subs.length === 0) {
        return new Response(
          JSON.stringify({ error: "No push subscriptions found for test user" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const sub of subs) {
        try {
          await sendPushNotification(sub, {
            title: "🔔 MASEYA Test",
            message: "Push delivery confirmed! Your reminders will work. ✅",
            url: "/",
          });
          results.push({ endpoint: sub.endpoint.slice(0, 50), status: "sent" });
        } catch (e) {
          results.push({ endpoint: sub.endpoint.slice(0, 50), status: "failed", error: e.message });
        }
      }

      return new Response(
        JSON.stringify({ test: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Normal cron mode ──
    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    const todayStr = now.toISOString().split("T")[0];

    const nudgeTargets: { timeOfDay: string; offsetHours: number[] }[] = [];
    const timezoneOffsets = [-5, -4, -3, 0, 1, 2, 3];

    for (const offset of timezoneOffsets) {
      const localHour = (currentHourUTC + offset + 24) % 24;
      if (localHour === 12) {
        nudgeTargets.push({ timeOfDay: "morning", offsetHours: [offset] });
      }
      if (localHour === 21) {
        nudgeTargets.push({ timeOfDay: "night", offsetHours: [offset] });
      }
    }

    if (nudgeTargets.length === 0) {
      return new Response(
        JSON.stringify({ message: "No nudge targets for this hour" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get users with reminders enabled
    const { data: enabledUsers, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, nickname, language, timezone")
      .eq("routine_reminders_enabled", true);

    if (profilesError) {
      throw profilesError;
    }

    if (!enabledUsers || enabledUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with reminders enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let notificationsSent = 0;

    for (const target of nudgeTargets) {
      // Get users who haven't completed this routine today
      const { data: completions } = await supabase
        .from("routine_completions")
        .select("user_id")
        .eq("completion_date", todayStr)
        .eq("time_of_day", target.timeOfDay)
        .eq("is_fully_completed", true);

      const completedUserIds = new Set(
        (completions || []).map((c: { user_id: string }) => c.user_id)
      );

      // Filter to users who haven't completed and match the timezone offset
      const usersToNudge = enabledUsers.filter(
        (u: { user_id: string; timezone: string | null }) => {
          if (completedUserIds.has(u.user_id)) return false;
          // Simple timezone matching - default to UTC if not set
          const userTz = u.timezone || "UTC";
          const userOffset = getTimezoneOffset(userTz);
          return target.offsetHours.includes(userOffset);
        }
      );

      if (usersToNudge.length === 0) continue;

      // Create in-app notifications
      const notifications = usersToNudge.map(
        (u: { user_id: string; language: string | null }) => ({
          user_id: u.user_id,
          type: "routine_reminder",
          title: getTitle(target.timeOfDay, u.language || "en"),
          message: getMessage(target.timeOfDay, u.language || "en"),
          data: { timeOfDay: target.timeOfDay, url: "/routine" },
        })
      );

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error inserting notifications:", notifError);
        continue;
      }

      // Send push notifications
      for (const user of usersToNudge) {
        const { data: subscriptions } = await supabase
          .from("push_subscriptions")
          .select("endpoint, p256dh, auth")
          .eq("user_id", user.user_id);

        if (subscriptions && subscriptions.length > 0) {
          for (const sub of subscriptions) {
            try {
              // Send via web-push (simplified - in production use web-push library)
              await sendPushNotification(sub, {
                title: getTitle(target.timeOfDay, user.language || "en"),
                message: getMessage(target.timeOfDay, user.language || "en"),
                url: "/routine",
              });
            } catch (e) {
              console.error("Push send error:", e);
            }
          }
        }
      }

      notificationsSent += usersToNudge.length;
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${notificationsSent} routine reminder(s)`,
        nudgeTargets: nudgeTargets.map((t) => t.timeOfDay),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Routine reminders error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getTimezoneOffset(timezone: string): number {
  // Dynamically compute the current UTC offset for the given IANA timezone,
  // which automatically accounts for DST transitions.
  try {
    const now = new Date();
    // Format a short date in the target timezone and in UTC, then diff them
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const utcFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const parseParts = (f: Intl.DateTimeFormat) => {
      const p = Object.fromEntries(
        f.formatToParts(now).map((x) => [x.type, x.value])
      );
      return Date.UTC(
        +p.year,
        +p.month - 1,
        +p.day,
        +(p.hour === "24" ? "0" : p.hour),
        +p.minute
      );
    };

    const localMs = parseParts(formatter);
    const utcMs = parseParts(utcFormatter);
    const offsetHours = Math.round((localMs - utcMs) / 3_600_000);
    return offsetHours;
  } catch {
    // If the timezone string is invalid, default to UTC
    console.warn(`Unknown timezone "${timezone}", defaulting to UTC offset 0`);
    return 0;
  }
}

function getTitle(timeOfDay: string, lang: string): string {
  const titles: Record<string, Record<string, string>> = {
    morning: {
      en: "☀️ Morning routine waiting!",
      es: "☀️ ¡Tu rutina matutina te espera!",
      fr: "☀️ Votre routine du matin vous attend !",
    },
    night: {
      en: "🌙 Don't forget your night routine!",
      es: "🌙 ¡No olvides tu rutina de noche!",
      fr: "🌙 N'oubliez pas votre routine du soir !",
    },
  };
  return titles[timeOfDay]?.[lang] || titles[timeOfDay]?.en || "Routine Reminder";
}

function getMessage(timeOfDay: string, lang: string): string {
  const messages: Record<string, Record<string, string>> = {
    morning: {
      en: "You haven't completed your morning routine yet. A few minutes of self-care goes a long way! 🌿",
      es: "Aún no has completado tu rutina matutina. ¡Unos minutos de autocuidado hacen maravillas! 🌿",
      fr: "Vous n'avez pas encore terminé votre routine du matin. Quelques minutes de soin font des merveilles ! 🌿",
    },
    night: {
      en: "Your skin deserves some love tonight. Complete your night routine before bed! ✨",
      es: "Tu piel merece cariño esta noche. ¡Completa tu rutina nocturna antes de dormir! ✨",
      fr: "Votre peau mérite de l'amour ce soir. Terminez votre routine avant de dormir ! ✨",
    },
  };
  return messages[timeOfDay]?.[lang] || messages[timeOfDay]?.en || "Time for your routine!";
}

// Sanitize base64 keys: trim whitespace, remove padding, convert to base64url
function sanitizeKey(key: string): string {
  return key.trim().replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; message: string; url: string }
) {
  const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.error("VAPID keys not configured — cannot send push");
    return;
  }

  const pubKey = sanitizeKey(VAPID_PUBLIC_KEY);
  const privKey = sanitizeKey(VAPID_PRIVATE_KEY);
  const p256dh = sanitizeKey(subscription.p256dh);
  const auth = sanitizeKey(subscription.auth);

  console.log(`VAPID pub: ${pubKey.length} chars, starts: ${pubKey.slice(0,8)}, ends: ${pubKey.slice(-4)}`);
  console.log(`VAPID priv: ${privKey.length} chars, starts: ${privKey.slice(0,4)}`);
  console.log(`p256dh: ${p256dh.length} chars, auth: ${auth.length} chars`);
  
  // Check for non-base64url characters
  const b64urlRegex = /^[A-Za-z0-9_-]+$/;
  console.log(`pubKey valid b64url: ${b64urlRegex.test(pubKey)}`);
  console.log(`privKey valid b64url: ${b64urlRegex.test(privKey)}`);
  console.log(`p256dh valid b64url: ${b64urlRegex.test(p256dh)}`);
  console.log(`auth valid b64url: ${b64urlRegex.test(auth)}`);

  webPush.setVapidDetails("mailto:hello@maseya.app", pubKey, privKey);

  await webPush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh, auth } },
    JSON.stringify(payload),
  );

  console.log(`Push sent to ${subscription.endpoint.slice(0, 50)}...`);
}
