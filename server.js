import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

console.log('API KEY:', process.env.ANTHROPIC_API_KEY ? 'loaded' : 'missing')

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

app.post('/api/signal', async (req, res) => {
  try {
    const { ticker, timeframe, risk } = req.body

    if (!ticker || !timeframe || risk === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: ticker, timeframe, risk'
      })
    }

    // Fetch real stock data from Polygon.io
    let stockData = ''
    try {
      const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${ticker}/prev?apiKey=${process.env.POLYGON_API_KEY}`
      const polygonResponse = await fetch(polygonUrl)
      const polygonData = await polygonResponse.json()

      if (polygonData.results && polygonData.results.length > 0) {
        const data = polygonData.results[0]
        const currentPrice = data.c || 'N/A'
        const openPrice = data.o || 'N/A'
        const highPrice = data.h || 'N/A'
        const lowPrice = data.l || 'N/A'
        const prevClose = polygonData.results[0].c || 'N/A'
        const changePercent = ((currentPrice - prevClose) / prevClose * 100).toFixed(2)
        
        stockData = `\n\nREAL MARKET DATA FOR ${ticker}:
- Current Price: $${currentPrice}
- Previous Close: $${prevClose}
- Change: ${changePercent > 0 ? '+' : ''}${changePercent}%
- Today's Range: $${lowPrice} - $${highPrice}
- Open: $${openPrice}`
      }
    } catch (err) {
      console.log('Polygon.io fetch failed:', err.message)
    }

    const prompt = `You are a professional trader analyzing ${ticker} on a ${timeframe} timeframe with a ${risk}% risk tolerance.${stockData}

Provide a concise trade signal as JSON with these exact fields (no markdown, just raw JSON):
{
  "signal": "BUY" | "SELL" | "HOLD",
  "conviction": <number 0-100>,
  "risk": <number 0-100>,
  "reasoning": "<2-3 sentence analysis>",
  "entry": "<price level or range>",
  "target": "<price target>",
  "stopLoss": "<stop loss price>"
}

Use the real market data provided above to make an informed decision. Provide specific price levels based on current market conditions.`

    const message = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    // Parse JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return res.status(500).json({
        error: 'Failed to parse signal response'
      })
    }

    const signal = JSON.parse(jsonMatch[0])

    res.json(signal)
  } catch (error) {
    console.error('Error:', error.message)
    res.status(500).json({
      error: error.message || 'Failed to generate signal'
    })
  }
})

app.listen(PORT, () => {
  console.log(`Apex trading server running on http://localhost:${PORT}`)
})
