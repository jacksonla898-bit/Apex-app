import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { fetchPolygonPrices } from '../lib/polygonPrices.js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const BADGE_SYSTEM_PROMPT = `You are a professional trading analyst. For each position provided, return a one-line JSON object with action ("HOLD", "TRIM", or "SELL") and conviction (0-100). Be concise — this is a quick batch scan, not deep analysis.

Rules:
- Return ONLY valid JSON: an object keyed by symbol, each value having { "action": "HOLD"|"TRIM"|"SELL", "conviction": number }.
- No markdown, no backticks, no explanation outside the JSON.
- HOLD = still looks good, no action needed
- TRIM = take some profits or reduce risk, but don't fully exit
- SELL = exit the position`

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId } = req.body
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Fetch all trades for this user
    const { data: trades, error: tradesErr } = await supabase
      .from('trades')
      .select('symbol, side, quantity, price, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })

    if (tradesErr) {
      console.error('Supabase error:', tradesErr.message, tradesErr.code, tradesErr.hint)
      return res.status(500).json({ error: tradesErr.message })
    }

    // Aggregate positions
    const posMap = {}
    for (const t of (trades || [])) {
      const sym   = t.symbol
      const qty   = parseFloat(t.quantity)
      const price = parseFloat(t.price)
      if (!posMap[sym]) posMap[sym] = { totalQty: 0, totalCost: 0 }

      if (t.side === 'buy') {
        posMap[sym].totalQty  += qty
        posMap[sym].totalCost += qty * price
      } else {
        const avg = posMap[sym].totalQty > 0 ? posMap[sym].totalCost / posMap[sym].totalQty : 0
        posMap[sym].totalQty  -= qty
        posMap[sym].totalCost  = posMap[sym].totalQty * avg
      }
    }

    const symbols = Object.entries(posMap)
      .filter(([, v]) => v.totalQty > 0.000001)
      .map(([sym, v]) => ({ sym, qty: v.totalQty, avgEntry: v.totalQty > 0 ? v.totalCost / v.totalQty : 0 }))

    if (symbols.length === 0) {
      return res.status(200).json({})
    }

    // Fetch current prices from Polygon
    const priceMap = {}
    try {
      const polygonPrices = await fetchPolygonPrices(symbols.map(s => s.sym))
      for (const [sym, data] of polygonPrices) {
        if (data.price != null) priceMap[sym] = data.price
      }
    } catch (err) {
      console.error('Polygon batch fetch failed:', err.message)
    }

    // Build context for Claude
    const positionLines = symbols.map(({ sym, qty, avgEntry }) => {
      const current  = priceMap[sym] ?? avgEntry
      const pnlPct   = avgEntry > 0 ? (((current - avgEntry) / avgEntry) * 100).toFixed(1) : '0.0'
      return `${sym}: ${qty.toFixed(2)} shares, entry $${avgEntry.toFixed(2)}, now $${current.toFixed(2)}, P&L ${pnlPct}%`
    }).join('\n')

    const userPrompt = `Batch scan these open positions and return exit action badges:\n\n${positionLines}\n\nReturn ONLY a JSON object like:\n{ "AAPL": { "action": "HOLD", "conviction": 75 }, "TSLA": { "action": "TRIM", "conviction": 60 } }`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 512,
      system:     BADGE_SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0]?.text ?? ''
    console.log('Portfolio exit signals raw:', raw)

    let badges = {}
    try {
      const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim()
      badges = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Badge JSON parse failed:', parseErr.message)
      // Return empty rather than 500 — badges are non-critical
      return res.status(200).json({})
    }

    // Validate and normalise each entry
    const valid = ['HOLD', 'TRIM', 'SELL']
    for (const sym of Object.keys(badges)) {
      if (!valid.includes(badges[sym]?.action)) badges[sym].action = 'HOLD'
      badges[sym].conviction = Number(badges[sym].conviction) || 50
    }

    return res.status(200).json(badges)
  } catch (err) {
    console.error('portfolio-exit-signals error:', err)
    return res.status(500).json({ error: err.message })
  }
}
