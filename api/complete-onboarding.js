import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, reset = false } = req.body
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { error } = await supabase
      .from('user_balances')
      .upsert(
        {
          user_id:               userId,
          onboarding_completed:  !reset,
          updated_at:            new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )

    if (error) {
      console.error('complete-onboarding error:', error.message, error.code, error.hint)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true, onboardingCompleted: !reset })
  } catch (err) {
    console.error('complete-onboarding error:', err)
    return res.status(500).json({ error: err.message })
  }
}
