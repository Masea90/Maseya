import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const now = new Date();
    const currentHourUTC = now.getUTCHours();
    const todayStr = now.toISOString().split("T")[0];

    // Determine which routine to nudge based on UTC hour
    // Morning nudge: around noon local time (we'll check various timezones)
    // Night nudge: around 9-10pm local time
    const nudgeTargets: { timeOfDay: string; offsetHours: number[] }[] = [];

    // For each common timezone offset, check if it's nudge time
    // Morning nudge at local noon (12:00): UTC hour = 12 - offset
    // Night nudge at local 21:00 (9pm): UTC hour = 21 - offset
    const timezoneOffsets = [-5, -4, -3, 0, 1, 2, 3]; // Americas, UTC, Europe, Africa

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
  // Map common timezone strings to UTC offsets
  const offsets: Record<string, number> = {
    UTC: 0,
    "Europe/London": 0,
    "Europe/Paris": 1,
    "Europe/Berlin": 1,
    "Europe/Madrid": 1,
    "Europe/Rome": 1,
    "Europe/Istanbul": 3,
    "Africa/Cairo": 2,
    "Africa/Casablanca": 1,
    "Africa/Lagos": 1,
    "America/New_York": -5,
    "America/Chicago": -6,
    "America/Denver": -7,
    "America/Los_Angeles": -8,
    "America/Sao_Paulo": -3,
    "America/Argentina/Buenos_Aires": -3,
    "America/Mexico_City": -6,
    "America/Bogota": -5,
  };
  return offsets[timezone] ?? 0;
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

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; message: string; url: string }
) {
  // Note: In production, you'd use the web-push protocol with VAPID keys
  // For now, this creates the notification in-app only
  // Push notification sending requires VAPID private key and web-push implementation
  console.log(
    `Would send push to ${subscription.endpoint}: ${payload.title}`
  );
}
