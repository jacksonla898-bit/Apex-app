import { createClient } from '@supabase/supabase-js'
import { computeEquity, insertSnapshot } from './_lib/computeEquity.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const equity = await computeEquity(supabase, userId)
    await insertSnapshot(supabase, userId, equity)

    return res.status(200).json({ success: true, totalEquity: equity.totalEquity })
  } catch (err) {
    console.error('snapshot-equity error:', err)
    return res.status(500).json({ error: err.message })
  }
}
