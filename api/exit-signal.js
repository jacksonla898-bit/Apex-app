import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a professional trading analyst advising whether to hold, trim, or exit an existing position.

Rules you MUST follow:
- Return ONLY valid JSON. No markdown, no backticks, no preamble.
- action must be exactly "HOLD", "TRIM", or "SELL".
- conviction: integer 0-100 reflecting confidence in the recommended action.
- target: price level where you'd take profits (plain number, no $ sign).
- stop: price level where you'd cut losses (plain number, no $ sign).
- reasonsToHold: exactly 3 strings, max 80 chars each — reasons the position may still have upside.
- reasonsToSell: exactly 3 strings, max 80 chars each — risks or reasons to exit.
- timeframe: human-readable string like "Hold 1-2 more weeks" or "Exit within days".
- catalyst: next key event that will determine the outcome.
- fullAnalysis: one dense paragraph of balanced exit reasoning.`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { symbol, userId } = req.body
  if (!symbol || !userId) {
    return res.status(400).json({ error: 'symbol and userId are required' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch all trades for this user + symbol to compute position
    const { data: trades, error: tradesErr } = await supabase
      .from('trades')
      .select('side, quantity, price, created_at')
      .eq('user_id', userId)
      .ilike('symbol', symbol)
      .order('created_at', { ascending: true })

    if (tradesErr) {
      console.error('Supabase error:', tradesErr.message, tradesErr.code, tradesErr.hint)
      return res.status(500).json({ error: tradesErr.message })
    }

    // Aggregate net position
    let totalQty = 0
    let totalCost = 0
    for (const t of (trades || [])) {
      const qty   = parseFloat(t.quantity)
      const price = parseFloat(t.price)
      if (t.side === 'buy') {
        totalQty  += qty
        totalCost += qty * price
      } else {
        const avg = totalQty > 0 ? totalCost / totalQty : 0
        totalQty  -= qty
        totalCost  = totalQty * avg
      }
    }

    if (totalQty < 0.000001) {
      return res.status(400).json({ error: 'No position found for this symbol' })
    }

    const avgEntryPrice = totalCost / totalQty
    const costBasis     = totalCost

    // Fetch current price from Alpaca
    let currentPrice = null
    let priceData    = ''
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
        if (snap?.dailyBar) {
          const d = snap.dailyBar
          const changePct = d.o ? (((d.c - d.o) / d.o) * 100).toFixed(2) : 'N/A'
          priceData = `Current: $${currentPrice}, Open: $${d.o}, High: $${d.h}, Low: $${d.l}, Close: $${d.c}, Volume: ${d.v}, Change today: ${changePct}%`
        }
      }
    } catch (err) {
      console.error('Alpaca fetch failed:', err.message)
    }

    // Compute P&L server-side
    const price        = currentPrice ?? avgEntryPrice
    const currentValue = totalQty * price
    const pnlDollars   = currentValue - costBasis
    const pnlPercent   = costBasis > 0 ? (pnlDollars / costBasis) * 100 : 0

    const userPrompt = `Analyze whether to hold, trim, or exit this open position in ${symbol.toUpperCase()}.

Position details:
- Shares held: ${totalQty.toFixed(4)}
- Average entry price: $${avgEntryPrice.toFixed(2)}
- Cost basis: $${costBasis.toFixed(2)}
- Current price: $${price.toFixed(2)}
- Unrealized P&L: ${pnlDollars >= 0 ? '+' : ''}$${pnlDollars.toFixed(2)} (${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%)
${priceData ? `Recent market data: ${priceData}` : 'No live market data — use training knowledge.'}

Return ONLY this JSON object with no other text:
{
  "action": "HOLD",
  "conviction": 72,
  "target": 165.00,
  "stop": 140.00,
  "reasonsToHold": ["First reason max 80 chars", "Second reason", "Third reason"],
  "reasonsToSell": ["First risk max 80 chars", "Second risk", "Third risk"],
  "timeframe": "Hold 1-2 more weeks",
  "catalyst": "Next earnings date or key event",
  "fullAnalysis": "One paragraph of balanced exit reasoning."
}`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0]?.text ?? ''
    console.log('Exit signal raw:', raw)

    let exitSignal
    try {
      const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim()
      exitSignal = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('JSON parse failed:', parseErr.message)
      return res.status(500).json({ error: 'Failed to parse exit signal JSON', rawText: raw })
    }

    // Enforce valid action
    if (!['HOLD', 'TRIM', 'SELL'].includes(exitSignal.action)) {
      exitSignal.action = 'HOLD'
    }

    return res.status(200).json({
      ...exitSignal,
      symbol:        symbol.toUpperCase(),
      qty:           parseFloat(totalQty.toFixed(6)),
      avgEntryPrice: parseFloat(avgEntryPrice.toFixed(2)),
      costBasis:     parseFloat(costBasis.toFixed(2)),
      currentPrice:  price,
      currentPnl: {
        dollars: parseFloat(pnlDollars.toFixed(2)),
        percent: parseFloat(pnlPercent.toFixed(2)),
      },
    })
  } catch (err) {
    console.error('exit-signal error:', err)
    return res.status(500).json({ error: err.message })
  }
}
