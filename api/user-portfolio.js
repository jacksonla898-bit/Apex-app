import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  try {
    // Server-side client — service role key bypasses RLS
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch all trades for the user in chronological order
    const { data: trades, error: tradesErr } = await supabase
      .from('trades')
      .select('symbol, side, quantity, price, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (tradesErr) {
      console.error('Trades fetch error:', tradesErr.message, tradesErr.code, tradesErr.hint)
      return res.status(500).json({ error: tradesErr.message })
    }

    // Aggregate trades into positions
    const map = {}
    for (const trade of (trades || [])) {
      const sym   = trade.symbol
      const qty   = parseFloat(trade.quantity)
      const price = parseFloat(trade.price)
      if (!map[sym]) map[sym] = { totalQty: 0, totalCost: 0 }

      if (trade.side === 'buy') {
        map[sym].totalQty  += qty
        map[sym].totalCost += qty * price
      } else {
        // sell: reduce cost basis proportionally
        const avgBefore = map[sym].totalQty > 0 ? map[sym].totalCost / map[sym].totalQty : 0
        map[sym].totalQty  -= qty
        map[sym].totalCost  = map[sym].totalQty * avgBefore
      }
    }

    const positions = Object.entries(map)
      .filter(([, v]) => v.totalQty > 0.000001)
      .map(([symbol, v]) => ({
        symbol,
        qty:           v.totalQty,
        avgEntryPrice: v.totalQty > 0 ? v.totalCost / v.totalQty : 0,
        costBasis:     v.totalCost,
      }))

    // Get or seed cash balance
    let cash = 10000
    const { data: balanceRow } = await supabase
      .from('user_balances')
      .select('cash')
      .eq('user_id', userId)
      .single()

    if (balanceRow) {
      cash = parseFloat(balanceRow.cash)
    } else {
      // First time — insert default $10,000
      await supabase
        .from('user_balances')
        .insert({ user_id: userId, cash: 10000 })
    }

    if (positions.length === 0) {
      return res.status(200).json({
        positions:      [],
        cash,
        positionsValue: 0,
        totalEquity:    cash,
        totalPnl:       0,
      })
    }

    // Fetch current prices from Alpaca snapshots
    const symbols = positions.map(p => p.symbol).join(',')
    const alpacaHeaders = {
      'APCA-API-KEY-ID':     process.env.ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
    }

    const priceMap = {}
    try {
      const snapshotRes = await fetch(
        `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${encodeURIComponent(symbols)}`,
        { headers: alpacaHeaders }
      )
      if (snapshotRes.ok) {
        const snapshots = await snapshotRes.json()
        for (const [sym, snap] of Object.entries(snapshots)) {
          // prefer latest trade price, fall back to daily bar close
          const price = snap?.latestTrade?.p ?? snap?.dailyBar?.c ?? null
          if (price != null) priceMap[sym] = price
        }
      }
    } catch (err) {
      console.error('Alpaca snapshot fetch failed, using entry prices:', err.message)
    }

    // Enrich each position with current price and P&L
    const enriched = positions.map(p => {
      const currentPrice   = priceMap[p.symbol] ?? p.avgEntryPrice
      const currentValue   = p.qty * currentPrice
      const unrealizedPnl  = currentValue - p.costBasis
      const unrealizedPnlPct = p.costBasis > 0 ? (unrealizedPnl / p.costBasis) * 100 : 0
      return {
        symbol:           p.symbol,
        qty:              p.qty,
        avgEntryPrice:    p.avgEntryPrice,
        costBasis:        p.costBasis,
        currentPrice,
        currentValue,
        unrealizedPnl,
        unrealizedPnlPct,
      }
    })

    const positionsValue = enriched.reduce((sum, p) => sum + p.currentValue, 0)
    const totalPnl       = enriched.reduce((sum, p) => sum + p.unrealizedPnl, 0)
    const totalEquity    = cash + positionsValue

    return res.status(200).json({ positions: enriched, cash, positionsValue, totalEquity, totalPnl })
  } catch (err) {
    console.error('user-portfolio error:', err)
    return res.status(500).json({ error: err.message })
  }
}
