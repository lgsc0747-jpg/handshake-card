// Daily tap-digest dispatcher.
// Triggered by pg_cron once per day. For each user with `notifPrefs.emailTaps` enabled,
// aggregate yesterday's interaction logs and invoke send-transactional-email.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // yesterday window in UTC
  const now = new Date()
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000)
  const dateLabel = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })

  // 1. find users opted in to tap digest emails
  const { data: prefRows, error: prefErr } = await supabase
    .from('user_preferences')
    .select('user_id, prefs')

  if (prefErr) {
    console.error('digest: pref fetch failed', prefErr)
    return new Response(JSON.stringify({ error: prefErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const optedIn = (prefRows ?? []).filter((r: any) => r?.prefs?.notifPrefs?.emailTaps === true)
  let queued = 0

  for (const row of optedIn) {
    try {
      // taps in window
      const { data: taps } = await supabase
        .from('interaction_logs')
        .select('id, entity_id, metadata')
        .eq('user_id', row.user_id)
        .eq('interaction_type', 'profile_view')
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())

      const totalTaps = taps?.length ?? 0
      if (totalTaps === 0) continue // skip silent days

      // unique visitors via metadata.visitor_id fallback to row id
      const visitorIds = new Set((taps ?? []).map((t: any) => t?.metadata?.visitor_id ?? t.id))
      const uniqueVisitors = visitorIds.size

      // leads in window
      const { count: leadCount } = await supabase
        .from('lead_captures')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', row.user_id)
        .gte('created_at', start.toISOString())
        .lt('created_at', end.toISOString())

      // breakdown by persona
      const personaCounts: Record<string, number> = {}
      for (const t of taps ?? []) {
        const pid = (t as any).entity_id
        if (pid) personaCounts[pid] = (personaCounts[pid] ?? 0) + 1
      }
      const personaIds = Object.keys(personaCounts)
      let topPersonas: { label: string; taps: number }[] = []
      if (personaIds.length > 0) {
        const { data: personas } = await supabase
          .from('personas')
          .select('id, label')
          .in('id', personaIds)
        topPersonas = (personas ?? [])
          .map((p: any) => ({ label: p.label, taps: personaCounts[p.id] ?? 0 }))
          .sort((a, b) => b.taps - a.taps)
      }

      // owner display name
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email_public')
        .eq('user_id', row.user_id)
        .maybeSingle()

      // resolve email — auth.users
      const { data: userResp } = await supabase.auth.admin.getUserById(row.user_id)
      const email = userResp?.user?.email
      if (!email) continue

      const dayKey = start.toISOString().slice(0, 10)
      await supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'daily-tap-digest',
          recipientEmail: email,
          idempotencyKey: `digest-${row.user_id}-${dayKey}`,
          templateData: {
            ownerName: profile?.display_name?.split(' ')[0] ?? null,
            dateLabel,
            totalTaps,
            totalLeads: leadCount ?? 0,
            uniqueVisitors,
            topPersonas,
            dashboardUrl: 'https://handshake-card.lovable.app/',
          },
        },
      })
      queued++
    } catch (e) {
      console.error('digest: user failed', row.user_id, e)
    }
  }

  return new Response(JSON.stringify({ queued, candidates: optedIn.length, window: { start, end } }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
