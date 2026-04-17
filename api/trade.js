import { createClient } from '@supabase/supabase-js'
import { computeEquity, insertSnapshot } from '../lib/computeEquity.js'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { ticker, side, qty = 1, userId, price } = req.body

    if (!ticker || !side) {
      return res.status(400).json({ error: 'Ticker and side are required' })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // For sell orders, verify the user holds enough shares
    if (side.toLowerCase() === 'sell') {
      if (!userId) {
        return res.status(400).json({ error: 'userId is required for sell orders' })
      }

      const { data: trades, error: tradesErr } = await supabase
        .from('trades')
        .select('side, quantity')
        .eq('user_id', userId)
        .ilike('symbol', ticker)
        .order('created_at', { ascending: true })

      if (tradesErr) {
        console.error('Ownership check error:', tradesErr.message, tradesErr.code, tradesErr.hint)
        return res.status(500).json({ error: 'Failed to verify share ownership' })
      }

      let netQty = 0
      for (const t of (trades || [])) {
        const q = parseFloat(t.quantity)
        netQty += t.side === 'buy' ? q : -q
      }

      if (netQty < parseFloat(qty)) {
        return res.status(400).json({ error: 'Insufficient shares.' })
      }
    }

    const headers = {
      'APCA-API-KEY-ID':     process.env.ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
      'Content-Type':        'application/json',
    }

    const orderData = {
      symbol:        ticker.toUpperCase(),
      qty:           qty,
      side:          side.toLowerCase(),
      type:          'market',
      time_in_force: 'day',
    }

    const response = await fetch('https://paper-api.alpaca.markets/v2/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Alpaca API error:', response.status, errorData)
      return res.status(response.status).json({
        error: `Failed to place ${side} order: ${errorData}`,
      })
    }

    const order = await response.json()
    console.log('Order placed successfully:', order)

    // Update cash balance if we have a userId
    if (userId) {
      try {
        const fillPrice = parseFloat(order.filled_avg_price) || parseFloat(price) || 0
        const tradeQty  = parseFloat(qty)
        const cashDelta = side.toLowerCase() === 'buy'
          ? -(tradeQty * fillPrice)
          :  (tradeQty * fillPrice)

        const { data: balanceRow } = await supabase
          .from('user_balances')
          .select('cash')
          .eq('user_id', userId)
          .single()

        const currentCash = balanceRow ? parseFloat(balanceRow.cash) : 10000
        const newCash     = currentCash + cashDelta

        await supabase
          .from('user_balances')
          .upsert(
            { user_id: userId, cash: newCash, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' }
          )
        // Fire-and-forget equity snapshot (non-blocking — doesn't delay the trade response)
        computeEquity(supabase, userId)
          .then(equity => insertSnapshot(supabase, userId, equity))
          .catch(err => console.error('Post-trade snapshot error:', err.message))
      } catch (cashErr) {
        console.error('Cash update error:', cashErr.message)
      }
    }

    return res.status(200).json({
      success: true,
      order,
      message: `${side.toUpperCase()} order for ${qty} share${qty > 1 ? 's' : ''} of ${ticker.toUpperCase()} placed successfully`,
    })

  } catch (error) {
    console.error('Trade API error:', error)
    return res.status(500).json({ error: error.message })
  }
}
