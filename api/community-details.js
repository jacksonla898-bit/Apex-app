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

    const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [{ data: trades, error: tradesErr }, { data: recent, error: recentErr }] = await Promise.all([
      supabase
        .from('trades')
        .select('user_id, side, quantity, price, sentiment, created_at')
        .ilike('symbol', symbol)
        .order('created_at', { ascending: true }),
      supabase
        .from('trades')
        .select('user_id, side, quantity, price, sentiment, created_at')
        .ilike('symbol', symbol)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (tradesErr) {
      console.error('Supabase trades error:', tradesErr.message, tradesErr.code, tradesErr.hint)
      return res.status(500).json({ error: tradesErr.message })
    }
    if (recentErr) {
      console.error('Supabase recent error:', recentErr.message, recentErr.code, recentErr.hint)
      return res.status(500).json({ error: recentErr.message })
    }

    // Aggregate all trades into per-user net positions + track last-buy sentiment
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

    // Fetch current price from Alpaca
    let currentPrice = null
    try {
      const snapshotRes = await fetch(
        `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(symbol.toUpperCase())}`,
        {
          headers: {
            'APCA-API-KEY-ID':     process.env.ALPACA_API_KEY,
            'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
          },
        }
      )
      if (snapshotRes.ok) {
        const snapshots = await snapshotRes.json()
        const snap = snapshots[symbol.toUpperCase()]
        currentPrice = snap?.latestTrade?.p ?? snap?.dailyBar?.c ?? null
      }
    } catch (err) {
      console.error('Alpaca snapshot fetch failed:', err.message)
    }

    // Build holders list
    const holders = Object.entries(userMap)
      .filter(([, v]) => v.totalQty > 0.000001)
      .map(([userId, v]) => {
        const avgEntryPrice = v.totalQty > 0 ? v.totalCost / v.totalQty : 0
        const priceForValue = currentPrice ?? avgEntryPrice
        const positionValue = v.totalQty * priceForValue
        return {
          userId,
          shares:        parseFloat(v.totalQty.toFixed(6)),
          avgEntryPrice: parseFloat(avgEntryPrice.toFixed(2)),
          positionValue: parseFloat(positionValue.toFixed(2)),
          sentiment:     v.lastBuySentiment,
        }
      })
      .sort((a, b) => b.shares - a.shares)

    const holderCount = holders.length

    // Weighted bullish percentage
    const weightedBullishSum = holders.reduce((sum, h) => sum + sentimentWeight(h.sentiment), 0)
    const weightedTotalSum   = weightedBullishSum  // all holders are long/bullish for now
    const bullishPct = holderCount > 0
      ? Math.round((weightedBullishSum / Math.max(weightedTotalSum, 0.001)) * 100)
      : 0
    const bearishPct = 0
    const neutralPct = 0

    // Sentiment breakdown (by holder, based on last-buy sentiment)
    const sentimentBreakdown = { high: 0, regular: 0, test: 0, unknown: 0 }
    for (const h of holders) {
      if (h.sentiment === 'high')         sentimentBreakdown.high++
      else if (h.sentiment === 'regular') sentimentBreakdown.regular++
      else if (h.sentiment === 'test')    sentimentBreakdown.test++
      else                                sentimentBreakdown.unknown++
    }

    const totalShares = holders.reduce((sum, h) => sum + h.shares, 0)
    const avgPositionSize = holderCount > 0
      ? holders.reduce((sum, h) => sum + h.positionValue, 0) / holderCount
      : 0

    const topHolders = holders.slice(0, 5).map(h => ({
      userId:        h.userId,
      shares:        h.shares,
      avgEntryPrice: h.avgEntryPrice,
    }))

    const whales = holders
      .filter(h => h.positionValue >= 10000)
      .map(h => ({
        userId:        h.userId,
        positionValue: h.positionValue,
        sentiment:     'Bullish',
      }))

    // bullishChange24h — replay aggregation against trades older than 24h
    let bullishChange24h = 0
    const tradesBefore24h = (trades || []).filter(t => t.created_at < cutoff24h)
    if (tradesBefore24h.length > 0) {
      const userMapBefore = {}
      for (const trade of tradesBefore24h) {
        const uid   = trade.user_id
        const qty   = parseFloat(trade.quantity)
        const price = parseFloat(trade.price)

        if (!userMapBefore[uid]) userMapBefore[uid] = { totalQty: 0, totalCost: 0, lastBuySentiment: null }

        if (trade.side === 'buy') {
          userMapBefore[uid].totalQty        += qty
          userMapBefore[uid].totalCost       += qty * price
          userMapBefore[uid].lastBuySentiment = trade.sentiment ?? null
        } else {
          const avgBefore = userMapBefore[uid].totalQty > 0
            ? userMapBefore[uid].totalCost / userMapBefore[uid].totalQty
            : 0
          userMapBefore[uid].totalQty  -= qty
          userMapBefore[uid].totalCost  = userMapBefore[uid].totalQty * avgBefore
        }
      }

      const holdersBefore = Object.values(userMapBefore).filter(v => v.totalQty > 0.000001)
      const wBullBefore = holdersBefore.reduce((sum, v) => sum + sentimentWeight(v.lastBuySentiment), 0)
      const wTotalBefore = wBullBefore
      const bullishPctBefore = holdersBefore.length > 0
        ? Math.round((wBullBefore / Math.max(wTotalBefore, 0.001)) * 100)
        : 0

      bullishChange24h = bullishPct - bullishPctBefore
    }

    const recentActivity = (recent || []).map(t => ({
      userId:    t.user_id,
      side:      t.side,
      quantity:  parseFloat(t.quantity),
      price:     parseFloat(t.price),
      sentiment: t.sentiment ?? null,
      createdAt: t.created_at,
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
      allHolders:       holders,
      whales,
      recentActivity,
      bullishChange24h,
      sentimentBreakdown,
    })
  } catch (err) {
    console.error('community-details error:', err)
    return res.status(500).json({ error: err.message })
  }
}
