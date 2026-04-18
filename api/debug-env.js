export default function handler(req, res) {
  const key = process.env.POLYGON_API_KEY
  res.status(200).json({
    POLYGON_API_KEY_defined: !!key,
    POLYGON_API_KEY_length: key ? key.length : 0,
    ALPACA_API_KEY_defined: !!process.env.ALPACA_API_KEY,
    ANTHROPIC_API_KEY_defined: !!process.env.ANTHROPIC_API_KEY,
  })
}
