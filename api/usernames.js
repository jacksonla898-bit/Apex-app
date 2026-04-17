import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userIds } = req.body
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(200).json({})
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
      .from('user_profiles')
      .select('user_id, username')
      .in('user_id', userIds)

    if (error) {
      console.error('usernames error:', error.message, error.code, error.hint)
      return res.status(500).json({ error: error.message })
    }

    const map = {}
    for (const row of (data || [])) {
      map[row.user_id] = row.username
    }

    return res.status(200).json(map)
  } catch (err) {
    console.error('usernames error:', err)
    return res.status(500).json({ error: err.message })
  }
}
