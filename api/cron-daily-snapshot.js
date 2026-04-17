import { createClient } from '@supabase/supabase-js'
import { computeEquity, insertSnapshot } from '../lib/computeEquity.js'

export default async function handler(req, res) {
  // Vercel cron jobs send GET requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch all users with a balance record
    const { data: users, error: usersErr } = await supabase
      .from('user_balances')
      .select('user_id')

    if (usersErr) {
      console.error('cron-daily-snapshot: users fetch error:', usersErr.message)
      return res.status(500).json({ error: usersErr.message })
    }

    const userIds = (users || []).map(u => u.user_id)
    console.log(`cron-daily-snapshot: snapshotting ${userIds.length} users`)

    let success = 0
    let failed  = 0

    // Process users sequentially to avoid hammering Alpaca
    for (const userId of userIds) {
      try {
        const equity = await computeEquity(supabase, userId)
        await insertSnapshot(supabase, userId, equity)
        success++
      } catch (err) {
        console.error(`cron-daily-snapshot: failed for ${userId}:`, err.message)
        failed++
      }
    }

    console.log(`cron-daily-snapshot: done. success=${success}, failed=${failed}`)
    return res.status(200).json({ success: true, snapshotsCreated: success, failed })
  } catch (err) {
    console.error('cron-daily-snapshot error:', err)
    return res.status(500).json({ error: err.message })
  }
}
