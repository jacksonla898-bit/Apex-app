import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a professional trading analyst. Your job is to analyze stocks and return a structured JSON signal.

Rules you MUST follow:
- Return ONLY valid JSON. No markdown, no backticks, no preamble, no explanation outside the JSON.
- Always provide real, specific bull AND bear cases — never one-sided analysis.
- Set conviction below 60 for weak or unclear setups and force the signal field to "HOLD".
- entry, target, and stop must be plain numbers (not strings, no $ sign).
- bullCase and bearCase must each be exactly 3 strings, max 80 chars each.
- timeframe is a human-readable string like "Swing (1-2 weeks)", "Day trade", or "Long-term (3+ months)".
- catalyst is a short phrase describing the next event likely to move the stock.
- fullAnalysis is one dense paragraph of balanced reasoning.
- scorecard values are integers 0-10; risk is exactly "Low", "Medium", or "High".`

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const { ticker, timeframe, risk } = req.body

    // Fetch previous-day price data from Polygon
    let priceData = ''
    let currentPrice = null
    try {
      const polygonRes = await fetch(
        `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${process.env.POLYGON_API_KEY}`
      )
      if (polygonRes.ok) {
        const polygonData = await polygonRes.json()
        if (polygonData.results?.length > 0) {
          const d = polygonData.results[0]
          currentPrice = d.c
          const changePct = d.o ? (((d.c - d.o) / d.o) * 100).toFixed(2) : 'N/A'
          priceData = `Open: $${d.o}, High: $${d.h}, Low: $${d.l}, Close: $${d.c}, Volume: ${d.v}, Change: ${changePct}%`
        }
      }
    } catch (err) {
      console.error('Polygon fetch failed:', err.message)
    }

    const userPrompt = `Analyze ${ticker.toUpperCase()} for a ${timeframe} timeframe trade. Investor risk tolerance: ${risk}%.
${priceData ? `Most recent session data: ${priceData}` : 'No live price data available — use your training knowledge for price estimates.'}

Return ONLY this JSON object with no other text:
{
  "signal": "BUY",
  "conviction": 75,
  "entry": 150.00,
  "target": 162.00,
  "stop": 144.00,
  "scorecard": {
    "technical": 7,
    "momentum": 6,
    "sentiment": 5,
    "fundamentals": 8,
    "risk": "Medium"
  },
  "bullCase": ["First bull point max 80 chars", "Second bull point", "Third bull point"],
  "bearCase": ["First bear point max 80 chars", "Second bear point", "Third bear point"],
  "timeframe": "Swing (1-2 weeks)",
  "catalyst": "Earnings report on May 1st",
  "fullAnalysis": "One paragraph of detailed balanced reasoning."
}`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-5',
      max_tokens: 1024,
      system:     SYSTEM_PROMPT,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const raw = message.content[0]?.text ?? ''
    console.log('Raw Claude response:', raw)

    let signal
    try {
      // Strip any accidental markdown fences just in case
      const cleaned = raw.replace(/```(?:json)?\n?/g, '').replace(/```\n?/g, '').trim()
      signal = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('JSON parse failed:', parseErr.message)
      return res.status(500).json({
        error:   'Failed to parse signal JSON from Claude response',
        details: parseErr.message,
        rawText: raw,
      })
    }

    // Enforce conviction threshold server-side
    if (signal.conviction < 60) {
      signal.signal = 'HOLD'
    }

    // Compute risk/reward ratio
    const entry  = Number(signal.entry)
    const target = Number(signal.target)
    const stop   = Number(signal.stop)
    let riskReward = null
    if (entry && target && stop && entry !== stop) {
      riskReward = signal.signal === 'SELL'
        ? (entry - target) / (stop - entry)   // short: profit / risk
        : (target - entry) / (entry - stop)   // long:  profit / risk
      riskReward = parseFloat(riskReward.toFixed(2))
    }

    return res.status(200).json({ ...signal, riskReward })
  } catch (error) {
    console.error('signal handler error:', error)
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}
