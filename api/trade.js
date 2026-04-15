export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { ticker, side, qty = 1 } = req.body

    if (!ticker || !side) {
      return res.status(400).json({ error: 'Ticker and side are required' })
    }

    const headers = {
      'APCA-API-KEY-ID': process.env.ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
      'Content-Type': 'application/json'
    }

    const orderData = {
      symbol: ticker.toUpperCase(),
      qty: qty,
      side: side.toLowerCase(),
      type: 'market',
      time_in_force: 'day'
    }

    const response = await fetch('https://paper-api.alpaca.markets/v2/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(orderData)
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('Alpaca API error:', response.status, errorData)
      return res.status(response.status).json({
        error: `Failed to place ${side} order: ${errorData}`
      })
    }

    const order = await response.json()
    console.log('Order placed successfully:', order)

    return res.status(200).json({
      success: true,
      order,
      message: `${side.toUpperCase()} order for ${qty} share${qty > 1 ? 's' : ''} of ${ticker.toUpperCase()} placed successfully`
    })

  } catch (error) {
    console.error('Trade API error:', error)
    return res.status(500).json({ error: error.message })
  }
}