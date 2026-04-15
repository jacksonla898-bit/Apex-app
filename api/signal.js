import Anthropic from '@anthropic-ai/sdk'

export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.status(200).end()

    const { ticker, timeframe, risk } = req.body

    let priceData = ''
    try {
      const polygonResponse = await fetch(`https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${process.env.POLYGON_API_KEY}`)
      if (polygonResponse.ok) {
        const polygonData = await polygonResponse.json()
        if (polygonData.results && polygonData.results.length > 0) {
          const data = polygonData.results[0]
          const currentPrice = data.c
          const previousClose = data.o
          const changePercent = previousClose ? ((currentPrice - previousClose) / previousClose * 100).toFixed(2) : 'N/A'
          priceData = `Current price: $${currentPrice}, Previous close: $${previousClose}, Change: ${changePercent}%`
        }
      }
    } catch (err) {
      console.error('Polygon fetch failed:', err)
    }

    const hasPriceData = !!priceData
    const prompt = hasPriceData
      ? `Give a trade signal for ${ticker} on ${timeframe} timeframe with ${risk} risk. ${priceData}. Respond with JSON only: {"signal":"BUY","conviction":75,"risk":50,"reasoning":"text","entry":"price","target":"price","stopLoss":"price"}`
      : `You are a trading analyst. Give a trade signal for ${ticker} on ${timeframe} timeframe with ${risk}% risk tolerance based on your knowledge of this company's fundamentals, recent business performance, sector trends, and general market conditions. You MUST provide a specific BUY, SELL, or HOLD signal with a conviction score, reasoning, and estimated price levels based on your training data. Do not refuse or say you cannot provide a signal. Respond with JSON only: {"signal":"BUY","conviction":75,"risk":50,"reasoning":"text","entry":"price","target":"price","stopLoss":"price"}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await response.json().catch((err) => {
      throw new Error(`Failed to parse Anthropic response JSON: ${err.message}`)
    })

    if (!response.ok) {
      const errorMessage = data.error || data.message || 'Unknown Anthropic API error'
      return res.status(response.status || 500).json({
        error: 'Anthropic API request failed',
        details: errorMessage,
        raw: data
      })
    }

    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      return res.status(500).json({
        error: 'Anthropic response missing content',
        raw: data
      })
    }

    const text = data.content[0].text
    console.log('Raw Anthropic response text:', text)
    if (!text) {
      return res.status(500).json({
        error: 'Anthropic response text is empty',
        raw: data
      })
    }

    let signal
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      signal = JSON.parse(cleaned)
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to parse signal JSON from Anthropic response',
        details: err.message,
        rawText: text
      })
    }

    return res.status(200).json(signal)
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack })
  }
}
