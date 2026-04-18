import { fetchPolygonPrices } from './polygonPrices.js'

const STARTING_BALANCE = 10000

/**
 * Computes current equity for a user.
 * Fetches trades from Supabase, aggregates positions, prices from Polygon, cash from user_balances.
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase  service-role client
 * @param {string} userId
 * @returns {{ cash: number, positionsValue: number, totalEquity: number }}
 */
export async function computeEquity(supabase, userId) {
  // Fetch trades
  const { data: trades, error: tradesErr } = await supabase
    .from('trades')
    .select('symbol, side, quantity, price')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (tradesErr) throw new Error(`trades fetch: ${tradesErr.message}`)

  // Aggregate into positions
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
      const avgBefore = map[sym].totalQty > 0
        ? map[sym].totalCost / map[sym].totalQty : 0
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

  // Fetch cash balance
  const { data: balanceRow } = await supabase
    .from('user_balances')
    .select('cash')
    .eq('user_id', userId)
    .single()

  const cash = balanceRow ? parseFloat(balanceRow.cash) : STARTING_BALANCE

  if (positions.length === 0) {
    return { cash, positionsValue: 0, totalEquity: cash }
  }

  // Fetch current prices from Polygon
  const priceMap = {}
  try {
    const polygonPrices = await fetchPolygonPrices(positions.map(p => p.symbol))
    for (const [sym, data] of polygonPrices) {
      if (data.price != null) priceMap[sym] = data.price
    }
  } catch (err) {
    console.error('computeEquity: Polygon fetch failed, using entry prices:', err.message)
  }

  let positionsValue = 0
  for (const p of positions) {
    const currentPrice = priceMap[p.symbol] ?? p.avgEntryPrice
    positionsValue += p.qty * currentPrice
  }

  const totalEquity = cash + positionsValue
  return { cash, positionsValue, totalEquity }
}

/**
 * Inserts an equity snapshot row for a user.
 */
export async function insertSnapshot(supabase, userId, { cash, positionsValue, totalEquity }) {
  const { error } = await supabase.from('equity_snapshots').insert({
    user_id:         userId,
    total_equity:    parseFloat(totalEquity.toFixed(2)),
    cash:            parseFloat(cash.toFixed(2)),
    positions_value: parseFloat(positionsValue.toFixed(2)),
  })
  if (error) throw new Error(`snapshot insert: ${error.message}`)
}
