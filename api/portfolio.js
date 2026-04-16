export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  try {
    const headers = {
      'APCA-API-KEY-ID':     process.env.ALPACA_API_KEY,
      'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY,
      'Content-Type':        'application/json',
    }
    const [accountRes, positionsRes] = await Promise.all([
      fetch('https://paper-api.alpaca.markets/v2/account',   { headers }),
      fetch('https://paper-api.alpaca.markets/v2/positions', { headers }),
    ])
    const account   = await accountRes.json()
    const positions = await positionsRes.json()
    return res.status(200).json({ account, positions })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
