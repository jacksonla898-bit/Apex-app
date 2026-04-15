import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { symbol, qty = 1, side = 'buy', type = 'market', timeInForce = 'day' } = req.body;

    if (!symbol) {
      return res.status(400).json({ error: 'Symbol is required' });
    }

    const apiKey = process.env.ALPACA_API_KEY;
    const secretKey = process.env.ALPACA_SECRET_KEY;

    if (!apiKey || !secretKey) {
      console.error('Missing Alpaca API credentials');
      return res.status(500).json({ error: 'API configuration error' });
    }

    // Place the order
    const orderResponse = await fetch('https://paper-api.alpaca.markets/v2/orders', {
      method: 'POST',
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': secretKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: symbol.toUpperCase(),
        qty: qty,
        side: side,
        type: type,
        time_in_force: timeInForce,
      }),
    });

    if (!orderResponse.ok) {
      const errorData = await orderResponse.text();
      console.error('Alpaca order API error:', orderResponse.status, orderResponse.statusText, errorData);
      return res.status(orderResponse.status).json({
        error: 'Failed to place order',
        details: errorData
      });
    }

    const orderData = await orderResponse.json();

    console.log('Order placed successfully:', orderData);
    res.status(200).json({
      success: true,
      order: orderData,
      message: `${side.toUpperCase()} order for ${qty} share${qty > 1 ? 's' : ''} of ${symbol.toUpperCase()} placed successfully`
    });

  } catch (error) {
    console.error('Trade API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}</content>
<parameter name="filePath">c:\Users\jacks\OneDrive\Desktop\apex-app\api\trade.js