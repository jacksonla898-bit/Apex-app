import { createClient } from '@supabase/supabase-js'

const SENTIMENT_WEIGHT = { high: 1.5, regular: 1.0, test: 0.5 }
const sentimentWeight = (s) => SENTIMENT_WEIGHT[s] ?? 1.0

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
      .select('user_id, side, quantity, price, sentiment, created_at')
      .ilike('symbol', symbol)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Supabase error:', error.message, error.code, error.hint)
      return res.status(500).json({ error: error.message })
    }

    // Aggregate per user: net qty, cost basis, and last-buy sentiment
    const userMap = {}
    for (const trade of (trades || [])) {
      const uid   = trade.user_id
      const qty   = parseFloat(trade.quantity)
      const price = parseFloat(trade.price)

      if (!userMap[uid]) userMap[uid] = { totalQty: 0, totalCost: 0, lastBuySentiment: null }

      if (trade.side === 'buy') {
        userMap[uid].totalQty        += qty
        userMap[uid].totalCost       += qty * price
        userMap[uid].lastBuySentiment = trade.sentiment ?? null
      } else {
        const avgBefore = userMap[uid].totalQty > 0
          ? userMap[uid].totalCost / userMap[uid].totalQty
          : 0
        userMap[uid].totalQty  -= qty
        userMap[uid].totalCost  = userMap[uid].totalQty * avgBefore
      }
    }

    // Filter to holders with a net long position
    const holders = Object.entries(userMap)
      .filter(([, v]) => v.totalQty > 0.000001)
      .map(([userId, v]) => ({
        userId,
        shares:        v.totalQty,
        avgEntryPrice: v.totalQty > 0 ? v.totalCost / v.totalQty : 0,
        positionValue: v.totalCost,
        sentiment:     v.lastBuySentiment,
      }))

    const holderCount = holders.length

    // Weighted bullish percentage
    // All current holders are long (bullish). Weight = sentiment multiplier.
    // When shorts are added, bearish holders will reduce the weighted bullish ratio.
    const weightedBullishSum = holders.reduce((sum, h) => sum + sentimentWeight(h.sentiment), 0)
    const weightedTotalSum   = weightedBullishSum  // all holders are bullish for now
    const bullishPct = holderCount > 0
      ? Math.round((weightedBullishSum / Math.max(weightedTotalSum, 0.001)) * 100)
      : 0
    const bearishPct = 0
    const neutralPct = 0

    // Sentiment breakdown (by holder)
    const sentimentBreakdown = { high: 0, regular: 0, test: 0, unknown: 0 }
    for (const h of holders) {
      if (h.sentiment === 'high')    sentimentBreakdown.high++
      else if (h.sentiment === 'regular') sentimentBreakdown.regular++
      else if (h.sentiment === 'test')    sentimentBreakdown.test++
      else                                sentimentBreakdown.unknown++
    }

    const totalShares = holders.reduce((sum, h) => sum + h.shares, 0)
    const avgPositionSize = holderCount > 0
      ? holders.reduce((sum, h) => sum + h.positionValue, 0) / holderCount
      : 0

    const topHolders = [...holders]
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
      sentimentBreakdown,
    })
  } catch (err) {
    console.error('community-conviction error:', err)
    return res.status(500).json({ error: err.message })
  }
}
