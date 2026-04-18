import { createClient } from '@supabase/supabase-js'
import { fetchPolygonPrices } from '../lib/polygonPrices.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol, userId: queryUserId } = req.query
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 200)

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch all trades across all users
    const { data: allTrades, error: tradesErr } = await supabase
      .from('trades')
      .select('user_id, symbol, side, quantity, price, created_at')
      .order('created_at', { ascending: true })

    if (tradesErr) {
      console.error('Supabase trades error:', tradesErr.message, tradesErr.code, tradesErr.hint)
      return res.status(500).json({ error: tradesErr.message })
    }

    // Fetch all cash balances
    const { data: balanceRows, error: balanceErr } = await supabase
      .from('user_balances')
      .select('user_id, cash')

    if (balanceErr) {
      console.error('Supabase balances error:', balanceErr.message, balanceErr.code, balanceErr.hint)
      return res.status(500).json({ error: balanceErr.message })
    }

    const cashByUser = {}
    for (const row of (balanceRows || [])) {
      cashByUser[row.user_id] = parseFloat(row.cash)
    }

    // Group trades by user
    const tradesByUser = {}
    for (const trade of (allTrades || [])) {
      if (!tradesByUser[trade.user_id]) tradesByUser[trade.user_id] = []
      tradesByUser[trade.user_id].push(trade)
    }

    // Collect all symbols we need prices for
    const allSymbols = new Set()
    for (const trades of Object.values(tradesByUser)) {
      for (const t of trades) allSymbols.add(t.symbol)
    }

    // Fetch current prices from Polygon
    const priceMap = {}
    if (allSymbols.size > 0) {
      try {
        const polygonPrices = await fetchPolygonPrices([...allSymbols])
        for (const [sym, data] of polygonPrices) {
          if (data.price != null) priceMap[sym] = data.price
        }
      } catch (err) {
        console.error('Polygon snapshot fetch failed, using entry prices:', err.message)
      }
    }

    const STARTING_BALANCE = 10000

    const userStats = []

    for (const [userId, trades] of Object.entries(tradesByUser)) {
      // --- Build current positions (same logic as user-portfolio.js) ---
      const posMap = {}
      for (const trade of trades) {
        const sym   = trade.symbol
        const qty   = parseFloat(trade.quantity)
        const price = parseFloat(trade.price)
        if (!posMap[sym]) posMap[sym] = { totalQty: 0, totalCost: 0 }

        if (trade.side === 'buy') {
          posMap[sym].totalQty  += qty
          posMap[sym].totalCost += qty * price
        } else {
          const avgBefore = posMap[sym].totalQty > 0
            ? posMap[sym].totalCost / posMap[sym].totalQty
            : 0
          posMap[sym].totalQty  -= qty
          posMap[sym].totalCost  = posMap[sym].totalQty * avgBefore
        }
      }

      // Compute positions value using current prices
      let positionsValue = 0
      for (const [sym, pos] of Object.entries(posMap)) {
        if (pos.totalQty > 0.000001) {
          const currentPrice = priceMap[sym] ?? (pos.totalQty > 0 ? pos.totalCost / pos.totalQty : 0)
          positionsValue += pos.totalQty * currentPrice
        }
      }

      const cash        = cashByUser[userId] ?? STARTING_BALANCE
      const totalEquity = cash + positionsValue
      const totalPnl    = totalEquity - STARTING_BALANCE
      const percentReturn = (totalPnl / STARTING_BALANCE) * 100

      // --- Win rate via FIFO matching on sells ---
      // Build per-symbol FIFO buy queues
      const buyQueues = {}   // symbol -> [{ qty, price }]
      let wins   = 0
      let losses = 0

      for (const trade of trades) {
        const sym   = trade.symbol
        const qty   = parseFloat(trade.quantity)
        const price = parseFloat(trade.price)

        if (trade.side === 'buy') {
          if (!buyQueues[sym]) buyQueues[sym] = []
          buyQueues[sym].push({ qty, price })
        } else {
          // Sell — FIFO match against buy queue
          if (!buyQueues[sym]) buyQueues[sym] = []
          let remaining = qty

          while (remaining > 0.000001 && buyQueues[sym].length > 0) {
            const head = buyQueues[sym][0]
            const matched = Math.min(remaining, head.qty)
            const pnl = (price - head.price) * matched

            if (pnl > 0) wins++
            else losses++

            head.qty  -= matched
            remaining -= matched
            if (head.qty < 0.000001) buyQueues[sym].shift()
          }
        }
      }

      const totalClosed = wins + losses
      const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : null
      const tradeCount = trades.length

      // --- Composite score ---
      const score =
        percentReturn * 0.4 +
        (winRate ?? 50) * 0.3 +
        (totalPnl / 100) * 0.2 +
        Math.min(tradeCount, 50) * 0.1

      userStats.push({
        userId,
        score:         parseFloat(score.toFixed(4)),
        percentReturn: parseFloat(percentReturn.toFixed(2)),
        totalPnl:      parseFloat(totalPnl.toFixed(2)),
        winRate:       winRate !== null ? parseFloat(winRate.toFixed(1)) : null,
        tradeCount,
        posMap,  // kept temporarily for symbol filtering below, stripped from output
      })
    }

    // Sort descending by score
    userStats.sort((a, b) => b.score - a.score)

    // Top 10% (minimum 1)
    const topCount    = Math.max(1, Math.ceil(userStats.length * 0.1))
    const topTraders  = userStats.slice(0, topCount)
    const topTraderIds = topTraders.map(u => u.userId)

    // Leaderboard — top N, strip internal posMap
    const leaderboard = userStats.slice(0, limit).map(({ posMap: _p, ...rest }) => rest)

    const response = { topTraderIds, leaderboard, totalUsers: userStats.length }

    // Per-user rank info
    if (queryUserId) {
      const rankIdx = userStats.findIndex(u => u.userId === queryUserId)
      if (rankIdx !== -1) {
        const u = userStats[rankIdx]
        response.userRank = {
          rank:          rankIdx + 1,
          percentReturn: u.percentReturn,
          totalPnl:      u.totalPnl,
          winRate:       u.winRate,
          tradeCount:    u.tradeCount,
          totalUsers:    userStats.length,
        }
      } else {
        // User exists in the system but has no trades yet
        response.userRank = null
      }
    }

    // Symbol-specific top trader conviction
    if (symbol) {
      let bullishTopTraders = 0
      let holdingTopTraders = 0

      for (const trader of topTraders) {
        const pos = trader.posMap[symbol.toUpperCase()] ?? null
        // also try case-insensitive match
        const posEntry = pos ?? Object.entries(trader.posMap).find(
          ([sym]) => sym.toLowerCase() === symbol.toLowerCase()
        )?.[1]

        if (posEntry && posEntry.totalQty > 0.000001) {
          holdingTopTraders++
          bullishTopTraders++  // holding = bullish (no shorts yet)
        }
      }

      response.topTraderBullishPct    = topTraders.length > 0
        ? Math.round((bullishTopTraders / topTraders.length) * 100)
        : 0
      response.topTraderHolderCount   = holdingTopTraders
      response.topTraderCount         = topTraders.length
    }

    return res.status(200).json(response)
  } catch (err) {
    console.error('top-traders error:', err)
    return res.status(500).json({ error: err.message })
  }
}
