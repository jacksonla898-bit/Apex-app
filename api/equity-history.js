import { createClient } from '@supabase/supabase-js'

const TIMEFRAME_DAYS = {
  '1D':  { today: true },
  '1W':  { days: 7 },
  '1M':  { days: 30 },
  '3M':  { days: 90 },
  '1Y':  { days: 365 },
  'ALL': { days: null },
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, timeframe = '1W' } = req.body
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const tf = TIMEFRAME_DAYS[timeframe] ?? TIMEFRAME_DAYS['1W']

    let query = supabase
      .from('equity_snapshots')
      .select('total_equity, cash, positions_value, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (tf.today) {
      const startOfDay = new Date()
      startOfDay.setUTCHours(0, 0, 0, 0)
      query = query.gte('created_at', startOfDay.toISOString())
    } else if (tf.days) {
      const since = new Date(Date.now() - tf.days * 24 * 60 * 60 * 1000)
      query = query.gte('created_at', since.toISOString())
    }

    const { data, error } = await query
    if (error) {
      console.error('equity-history error:', error.message, error.code, error.hint)
      return res.status(500).json({ error: error.message })
    }

    const history = (data || []).map(row => ({
      timestamp:      row.created_at,
      totalEquity:    parseFloat(row.total_equity),
      cash:           parseFloat(row.cash),
      positionsValue: parseFloat(row.positions_value),
    }))

    return res.status(200).json({ history })
  } catch (err) {
    console.error('equity-history error:', err)
    return res.status(500).json({ error: err.message })
  }
}
