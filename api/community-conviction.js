import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol } = req.query
  if (!symbol) {
    return res.status(400).json({ error: 'symbol query parameter is required' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: trades, error } = await supabase
      .from('trades')
      .select('user_id, side, quantity, price')
      .ilike('symbol', symbol)

    if (error) {
      console.error('Supabase error:', error.message, error.code, error.hint)
      return res.status(500).json({ error: error.message })
    }

    // Aggregate per user: net qty and weighted cost basis
    const userMap = {}
    for (const trade of (trades || [])) {
      const uid   = trade.user_id
      const qty   = parseFloat(trade.quantity)
      const price = parseFloat(trade.price)

      if (!userMap[uid]) userMap[uid] = { totalQty: 0, totalCost: 0 }

      if (trade.side === 'buy') {
        userMap[uid].totalQty  += qty
        userMap[uid].totalCost += qty * price
      } else {
        // sell: reduce cost basis proportionally
        const avgBefore = userMap[uid].totalQty > 0
          ? userMap[uid].totalCost / userMap[uid].totalQty
          : 0
        userMap[uid].totalQty  -= qty
        userMap[uid].totalCost  = userMap[uid].totalQty * avgBefore
      }
    }

    // Filter out zero/negative net positions
    const holders = Object.entries(userMap)
      .filter(([, v]) => v.totalQty > 0.000001)
      .map(([userId, v]) => ({
        userId,
        shares:        v.totalQty,
        avgEntryPrice: v.totalQty > 0 ? v.totalCost / v.totalQty : 0,
        positionValue: v.totalCost,
      }))

    const holderCount = holders.length

    const bullishCount = holders.filter(h => h.shares > 0).length
    const bullishPct   = holderCount > 0 ? Math.round((bullishCount / holderCount) * 100) : 0
    const bearishPct   = 0
    const neutralPct   = 0

    const totalShares = holders.reduce((sum, h) => sum + h.shares, 0)
    const avgPositionSize = holderCount > 0
      ? holders.reduce((sum, h) => sum + h.positionValue, 0) / holderCount
      : 0

    const topHolders = holders
      .sort((a, b) => b.shares - a.shares)
      .slice(0, 5)
      .map(h => ({
        userId:        h.userId,
        shares:        parseFloat(h.shares.toFixed(6)),
        avgEntryPrice: parseFloat(h.avgEntryPrice.toFixed(2)),
      }))

    return res.status(200).json({
      symbol:           symbol.toUpperCase(),
      holderCount,
      bullishPct,
      bearishPct,
      neutralPct,
      avgPositionSize:  parseFloat(avgPositionSize.toFixed(2)),
      totalShares:      parseFloat(totalShares.toFixed(6)),
      topHolders,
    })
  } catch (err) {
    console.error('community-conviction error:', err)
    return res.status(500).json({ error: err.message })
  }
}
