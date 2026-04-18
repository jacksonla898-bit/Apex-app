import { createClient } from '@supabase/supabase-js'

const RESERVED = new Set([
  'admin', 'conviction', 'support', 'moderator', 'null', 'undefined',
  'api', 'www', 'help', 'info', 'root', 'system', 'bot',
])

const PROFANITY = new Set([
  'fuck', 'shit', 'ass', 'bitch', 'cunt', 'dick', 'cock', 'pussy',
  'nigger', 'nigga', 'faggot', 'retard', 'whore', 'slut',
])

function validate(username) {
  if (!username || typeof username !== 'string') return 'Username is required.'
  if (username.length < 3)  return 'Username must be at least 3 characters.'
  if (username.length > 20) return 'Username must be 20 characters or fewer.'
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Only letters, numbers, and underscores are allowed.'
  const lower = username.toLowerCase()
  if (RESERVED.has(lower)) return 'That username is reserved.'
  if ([...PROFANITY].some(w => lower.includes(w))) return 'That username is not allowed.'
  return null
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Set or check username when `username` field is present
  if (req.body.username !== undefined) {
    const { userId, username, checkOnly = false } = req.body

    const validationError = validate(username)
    if (validationError) {
      return res.status(400).json({ error: validationError })
    }

    const usernameLower = username.toLowerCase()

    const { data: existing } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('username_lower', usernameLower)
      .single()

    if (existing && existing.user_id !== userId) {
      return res.status(400).json({ error: 'That username is already taken.' })
    }

    if (checkOnly) {
      return res.status(200).json({ available: true, username })
    }

    if (!userId) {
      return res.status(400).json({ error: 'userId is required.' })
    }

    const { error } = await supabase
      .from('user_profiles')
      .upsert(
        { user_id: userId, username, username_lower: usernameLower },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('set-username error:', error.message, error.code, error.hint)
      if (error.code === '23505') {
        return res.status(400).json({ error: 'That username is already taken.' })
      }
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, username })
  }

  // Batch resolve userIds → { userId: username }
  const { userIds } = req.body
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return res.status(200).json({})
  }

  try {
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
