// Welcome email sender — invoked ONLY by the database trigger on profiles
// (see migration welcome_email_trigger). Not callable from the browser:
// requires the shared secret stored server-side in app_config.
//
// Guarantees:
//  - One send per user, ever: dedupe via email_send_log (template 'welcome')
//    + idempotency key welcome-<user_id>.
//  - Only users whose email is confirmed (covers Google OAuth, confirmed
//    instantly, and email+password signups after they confirm).
//  - Never sent to pre-existing users: hard cutoff on account creation date.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendTemplateEmail } from '../_shared/transactional-email-templates/send-email.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, x-welcome-secret',
}

// Accounts created before this deploy must never receive the welcome email.
const CUTOFF_ISO = '2026-09-20T00:00:00Z'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceKey) {
    return json({ error: 'Server misconfigured' }, 500)
  }
  const admin = createClient(supabaseUrl, serviceKey)

  // Shared-secret check: the secret lives only in app_config (service-role
  // reads only) and is sent by the DB trigger as a header.
  const provided = req.headers.get('x-welcome-secret') ?? ''
  const { data: secretRow } = await admin
    .from('app_config')
    .select('value')
    .eq('key', 'welcome_trigger_secret')
    .maybeSingle()
  if (!secretRow?.value || provided !== secretRow.value) {
    return json({ error: 'Unauthorized' }, 401)
  }

  let userId: string
  try {
    const body = await req.json()
    userId = typeof body?.user_id === 'string' ? body.user_id : ''
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  if (!/^[0-9a-f-]{36}$/i.test(userId)) {
    return json({ error: 'Invalid user_id' }, 400)
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(userId)
  const user = userData?.user
  if (userError || !user?.email) {
    return json({ skipped: 'user_not_found' })
  }
  if (!user.email_confirmed_at) {
    // Email+password signup not confirmed yet: the trigger fires again on the
    // next profile write after confirmation.
    return json({ skipped: 'email_not_confirmed' })
  }
  if (!user.created_at || user.created_at < CUTOFF_ISO) {
    return json({ skipped: 'preexisting_user' })
  }

  const email = user.email

  // One welcome per user, ever.
  const { data: already } = await admin
    .from('email_send_log')
    .select('id')
    .eq('template_name', 'welcome')
    .eq('recipient_email', email)
    .limit(1)
  if (already && already.length > 0) {
    return json({ skipped: 'already_sent' })
  }

  try {
    const result = await sendTemplateEmail('welcome', email, {
      idempotencyKey: `welcome-${userId}`,
    })
    await admin.from('email_send_log').insert({
      template_name: 'welcome',
      recipient_email: email,
      status: result.sent ? 'sent' : 'suppressed',
      metadata: { user_id: userId },
    })
    return json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    // Do NOT log a row on failure: a transient error must allow a later retry
    // via the next profile write.
    console.error('[welcome] send failed', message)
    return json({ error: 'send_failed' }, 500)
  }
})
