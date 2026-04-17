import { useState, useEffect } from 'react'
import './App.css'
import { supabase, recordTrade } from './supabaseClient'
import Landing from './Landing'
import Profile from './Profile'
import FeedScreen from './Feed'
import FundsScreen from './Funds'
import {
  LayoutDashboard,
  Rss,
  Bot,
  Briefcase,
  User,
  RefreshCw,
  Check,
  Zap,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Users,
  X,
  ArrowUp,
  ArrowDown,
  Activity,
} from 'lucide-react'

// Toast notification component
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in">
      <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold flex items-center gap-2">
        <Check className="w-4 h-4" />
        {message}
      </div>
    </div>
  )
}

// Loading Spinner
const Spinner = () => (
  <div className="flex justify-center items-center p-8">
    <div className="w-12 h-12 border-4 border-[#2a2a2a] border-t-emerald-500 rounded-full animate-spin"></div>
  </div>
)

// Avatar with initials
const Avatar = ({ name, bgColor = 'bg-emerald-500' }) => {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
  
  return (
    <div className={`${bgColor} w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white`}>
      {initials}
    </div>
  )
}

// Simple Line Chart Component
const LineChart = ({ data = [45, 52, 48, 65, 58, 72, 68, 75, 82, 70, 78, 85] }) => {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min
  const svgHeight = 80
  const svgWidth = 100
  const padding = 5
  
  const points = data.map((value, i) => {
    const x = ((i / (data.length - 1)) * (svgWidth - padding * 2)) + padding
    const y = svgHeight - padding - ((value - min) / range * (svgHeight - padding * 2))
    return `${x},${y}`
  }).join(' ')
  
  return (
    <svg width="100%" height="80" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="text-emerald-400">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// Progress Bar Component
const ProgressBar = ({ value, color = 'bg-emerald-500' }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center mb-2">
      <span className="text-xs text-gray-400">{value}%</span>
    </div>
    <div className="w-full h-2 bg-[#0f0f0f] rounded-full overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${value}%` }}
      ></div>
    </div>
  </div>
)


// Portfolio Screen
const PortfolioScreen = ({ onLogout, refreshTrigger }) => {
  const [positions, setPositions]         = useState([])
  const [prices, setPrices]               = useState({})
  const [cash, setCash]                   = useState(0)
  const [positionsValue, setPositionsValue] = useState(0)
  const [totalEquity, setTotalEquity]     = useState(0)
  const [totalPnl, setTotalPnl]           = useState(0)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)

  useEffect(() => {
    loadPortfolio()
  }, [refreshTrigger])

  const loadPortfolio = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { session }, error: authErr } = await supabase.auth.getSession()
      if (authErr || !session) throw new Error('Not authenticated')

      const res = await fetch('/api/user-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }
      const { positions: raw, cash: cashVal, positionsValue: posVal, totalEquity: equityVal, totalPnl: pnlVal } = await res.json()

      setPositions((raw || []).map(p => ({
        symbol:        p.symbol,
        qty:           p.qty,
        avgEntryPrice: p.avgEntryPrice,
        costBasis:     p.costBasis,
      })))

      const priceMap = {}
      for (const p of (raw || [])) {
        if (p.currentPrice != null) priceMap[p.symbol] = p.currentPrice
      }
      setPrices(priceMap)
      setCash(cashVal ?? 0)
      setPositionsValue(posVal ?? 0)
      setTotalEquity(equityVal ?? 0)
      setTotalPnl(pnlVal ?? 0)
    } catch (err) {
      console.error('Error loading portfolio:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold">
            Logout
          </button>
        </div>
        <div className="text-center py-8 text-gray-400">
          <div className="w-8 h-8 border-4 border-[#2a2a2a] border-t-emerald-500 rounded-full animate-spin mx-auto mb-4"></div>
          Loading portfolio...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold">
            Logout
          </button>
        </div>
        <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-2xl p-6">
          <p className="text-red-400 font-semibold mb-2">Portfolio Error</p>
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={loadPortfolio} className="mt-4 bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold">
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex justify-between items-center">
        <button
          onClick={loadPortfolio}
          className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition font-semibold flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold">
          Logout
        </button>
      </div>

      {/* Account Overview */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
        <p className="text-gray-400 text-sm mb-2">Total Equity</p>
        <div className="text-5xl font-bold text-white mb-2">
          ${fmt(totalEquity)}
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-gray-400 text-xs">Cash</p>
            <p className="text-white font-semibold">${fmt(cash)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Positions Value</p>
            <p className="text-white font-semibold">${fmt(positionsValue)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Unrealized P&L</p>
            <p className={`font-semibold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPnl >= 0 ? '+' : ''}${fmt(totalPnl)}
            </p>
          </div>
        </div>
        <div className="mt-6 h-20">
          <LineChart />
        </div>
      </div>

      {/* Positions */}
      <div>
        <h3 className="text-white font-semibold text-lg mb-4">Your Positions</h3>
        {positions.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a2a2a] text-center">
            <div className="text-gray-400 mb-2">No positions yet</div>
            <div className="text-gray-500 text-sm">Start trading to see your positions here</div>
          </div>
        ) : (
          <div className="space-y-2">
            {positions.map((position) => {
              const currentPrice  = prices[position.symbol] ?? position.avgEntryPrice
              const marketValue   = position.qty * currentPrice
              const pl            = marketValue - position.costBasis
              const plPct         = position.costBasis > 0 ? (pl / position.costBasis) * 100 : 0
              const isGain        = pl >= 0
              return (
                <div key={position.symbol} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] hover:bg-[#222] transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-bold text-white text-base">{position.symbol}</div>
                      <div className="text-gray-500 text-xs mt-0.5">
                        {position.qty % 1 === 0 ? position.qty : position.qty.toFixed(4)} shares @ ${fmt(position.avgEntryPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-semibold">${fmt(currentPrice)}</div>
                      <div className="text-gray-500 text-xs mt-0.5">{prices[position.symbol] ? 'live price' : 'entry price'}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
                    <div>
                      <div className="text-gray-500 text-xs">Market Value</div>
                      <div className="text-white text-sm font-medium">${fmt(marketValue)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-xs">Unrealized P&L</div>
                      <div className={`text-sm font-bold ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isGain ? '+' : ''}${fmt(pl)}{' '}
                        <span className="text-xs font-semibold">
                          ({isGain ? '+' : ''}{plPct.toFixed(2)}%)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// Time-ago helper
function timeAgo(isoString) {
  const secs = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (secs < 60)  return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

// Community Details Modal
const CommunityModal = ({ ticker, onClose }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch(`/api/community-details?symbol=${encodeURIComponent(ticker)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(setData)
      .catch(() => setError('Failed to load community data'))
      .finally(() => setLoading(false))
  }, [ticker])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] bg-[#1a1a1a] shrink-0">
        <div>
          <div className="text-white font-bold text-lg">{ticker.toUpperCase()}</div>
          <div className="text-gray-400 text-xs">Community Conviction</div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#2a2a2a] transition">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
        {loading && <Spinner />}
        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-300 text-sm">{error}</div>
        )}

        {data && (
          <>
            {/* Bullish / Bearish / Neutral bars */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs w-16 shrink-0">Bullish</span>
                <div className="flex-1 bg-[#1a1a1a] rounded-full h-2">
                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${data.bullishPct}%` }} />
                </div>
                <span className="text-emerald-400 text-xs font-bold w-9 text-right">{data.bullishPct}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs w-16 shrink-0">Bearish</span>
                <div className="flex-1 bg-[#1a1a1a] rounded-full h-2">
                  <div className="h-2 rounded-full bg-red-500" style={{ width: `${data.bearishPct}%` }} />
                </div>
                <span className="text-red-400 text-xs font-bold w-9 text-right">{data.bearishPct}%</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-xs w-16 shrink-0">Neutral</span>
                <div className="flex-1 bg-[#1a1a1a] rounded-full h-2">
                  <div className="h-2 rounded-full bg-gray-500" style={{ width: `${data.neutralPct}%` }} />
                </div>
                <span className="text-gray-400 text-xs font-bold w-9 text-right">{data.neutralPct}%</span>
              </div>
            </div>

            {/* 24h change */}
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
              {data.bullishChange24h > 0
                ? <ArrowUp className="w-4 h-4 text-emerald-400 shrink-0" />
                : data.bullishChange24h < 0
                ? <ArrowDown className="w-4 h-4 text-red-400 shrink-0" />
                : <Activity className="w-4 h-4 text-gray-500 shrink-0" />
              }
              <span className={`text-sm font-semibold ${data.bullishChange24h > 0 ? 'text-emerald-400' : data.bullishChange24h < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                {data.bullishChange24h > 0 ? '+' : ''}{data.bullishChange24h}% bullish in 24h
              </span>
              <span className="text-gray-500 text-xs">
                {data.bullishChange24h > 0 ? '(momentum growing)' : data.bullishChange24h < 0 ? '(cooling off)' : '(no change)'}
              </span>
            </div>

            {/* Top Holders */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white text-xs font-semibold uppercase tracking-wider">Top Holders</span>
                <span className="text-gray-500 text-xs">({data.holderCount} total)</span>
              </div>
              {data.allHolders.length === 0 ? (
                <div className="text-gray-500 text-sm">No holders yet.</div>
              ) : (
                <div className="space-y-2">
                  {data.allHolders.slice(0, 10).map((h, i) => (
                    <div key={h.userId} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-500 text-xs w-4">{i + 1}</span>
                        <div>
                          <div className="text-white text-sm font-mono">{h.userId.slice(0, 8)}…</div>
                          <div className="text-gray-500 text-xs">{h.shares.toFixed(4)} shares @ ${h.avgEntryPrice.toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="text-emerald-400 text-sm font-semibold">${h.positionValue.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Whales */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-white text-xs font-semibold uppercase tracking-wider">Whales</span>
                <span className="text-gray-500 text-xs">(≥$10,000 position)</span>
              </div>
              {data.whales.length === 0 ? (
                <div className="text-gray-500 text-sm bg-[#1a1a1a] rounded-lg px-4 py-3 border border-[#2a2a2a]">No whale positions yet.</div>
              ) : (
                <div className="space-y-2">
                  {data.whales.map((w) => (
                    <div key={w.userId} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg px-4 py-3 border border-[#2a2a2a]">
                      <div>
                        <div className="text-white text-sm font-mono">{w.userId.slice(0, 8)}…</div>
                        <div className="text-emerald-400 text-xs">{w.sentiment}</div>
                      </div>
                      <div className="text-blue-400 text-sm font-semibold">${w.positionValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-white text-xs font-semibold uppercase tracking-wider">Recent Activity</span>
              </div>
              {data.recentActivity.length === 0 ? (
                <div className="text-gray-500 text-sm">No activity yet.</div>
              ) : (
                <div className="space-y-2">
                  {data.recentActivity.map((t, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg px-4 py-2.5 border border-[#2a2a2a]">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${t.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {t.side === 'buy' ? 'BUY' : 'SELL'}
                        </span>
                        <span className="text-gray-300 text-xs font-mono">{t.userId.slice(0, 8)}…</span>
                        <span className="text-gray-500 text-xs">{t.quantity} shares @ ${t.price.toFixed(2)}</span>
                      </div>
                      <span className="text-gray-600 text-xs shrink-0 ml-2">{timeAgo(t.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// AI Trader Screen
const AITraderScreen = ({ onTradeSuccess }) => {
  const [tickerInput, setTickerInput] = useState('AAPL')
  const [timeframe, setTimeframe] = useState('1h')
  const [risk, setRisk] = useState(50)
  const [signal, setSignal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [tradeLoading, setTradeLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)
  const [communityData, setCommunityData] = useState(null)
  const [topTradersData, setTopTradersData] = useState(null)
  const [showCommunityModal, setShowCommunityModal] = useState(false)

  const popularTickers = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'SPY', 'AMD', 'GOOGL', 'BTC-USD', 'ETH-USD', 'NFLX']

  const handleRunSignal = async () => {
    setLoading(true)
    setError(null)
    setSignal(null)
    setCommunityData(null)
    setTopTradersData(null)
    setShowFullAnalysis(false)

    try {
      const [signalRes, communityRes, topTradersRes] = await Promise.all([
        fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: tickerInput, timeframe, risk })
        }),
        fetch(`/api/community-conviction?symbol=${encodeURIComponent(tickerInput)}`),
        fetch(`/api/top-traders?symbol=${encodeURIComponent(tickerInput)}`),
      ])

      if (!signalRes.ok) {
        throw new Error('Failed to generate signal')
      }

      const [signalData, communityJson, topTradersJson] = await Promise.all([
        signalRes.json(),
        communityRes.ok ? communityRes.json() : null,
        topTradersRes.ok ? topTradersRes.json() : null,
      ])

      setSignal(signalData)
      setCommunityData(communityJson)
      setTopTradersData(topTradersJson)
    } catch (err) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceTrade = async () => {
    if (!signal || signal.signal !== 'BUY' || signal.conviction < 60) return

    setTradeLoading(true)
    setToast(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const entryPrice = parseFloat(String(signal.entry).replace(/[^0-9.]/g, '')) || 0

      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: tickerInput,
          qty:    1,
          side:   'buy',
          userId: session?.user?.id,
          price:  entryPrice,
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place trade')
      }

      const data = await response.json()
      setToast(data.message)
      console.log('Trade placed:', data)

      if (entryPrice > 0) {
        await recordTrade({ symbol: tickerInput, side: 'buy', quantity: 1, price: entryPrice })
      }

      if (onTradeSuccess) onTradeSuccess()
    } catch (err) {
      setToast(err.message)
      console.error('Trade error:', err)
    } finally {
      setTradeLoading(false)
    }
  }

  const verdictStyle = signal
    ? signal.signal === 'BUY'
      ? { border: 'border-emerald-500/40', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badgeBg: 'bg-emerald-500' }
      : signal.signal === 'SELL'
      ? { border: 'border-red-500/40', bg: 'bg-red-500/10', text: 'text-red-400', badgeBg: 'bg-red-500' }
      : { border: 'border-yellow-500/40', bg: 'bg-yellow-500/10', text: 'text-yellow-400', badgeBg: 'bg-yellow-500' }
    : null

  const scorecardDimensions = signal?.scorecard
    ? [
        { label: 'Technical',    value: signal.scorecard.technical },
        { label: 'Momentum',     value: signal.scorecard.momentum },
        { label: 'Sentiment',    value: signal.scorecard.sentiment },
        { label: 'Fundamentals', value: signal.scorecard.fundamentals },
      ]
    : []

  const overallConviction = signal
    ? Math.round(
        communityData && topTradersData
          ? signal.conviction * 0.4 + topTradersData.topTraderBullishPct * 0.35 + communityData.bullishPct * 0.25
          : communityData
          ? signal.conviction * 0.5 + communityData.bullishPct * 0.5
          : signal.conviction
      )
    : null

  const lowConviction = signal && signal.conviction < 60

  return (
    <div className="space-y-6">
      {/* Stock Picker */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-base">Stock Picker</h3>
        <input
          type="text"
          value={tickerInput}
          onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
          onKeyPress={(e) => e.key === 'Enter' && handleRunSignal()}
          placeholder="Enter ticker symbol (e.g., NVDA, AAPL, SPY)"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition"
        />
        <div className="flex flex-wrap gap-2">
          {popularTickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => setTickerInput(ticker)}
              className="py-1.5 px-3 rounded-full font-semibold text-xs bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a] hover:border-[#3a3a3a] transition"
            >
              {ticker}
            </button>
          ))}
        </div>
      </div>

      {/* Timeframe Dropdown */}
      <div className="space-y-2">
        <label className="text-white text-sm font-semibold">Timeframe</label>
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition appearance-none cursor-pointer"
        >
          <option value="1m">1 Minute</option>
          <option value="5m">5 Minutes</option>
          <option value="15m">15 Minutes</option>
          <option value="1h">1 Hour</option>
          <option value="1d">1 Day</option>
          <option value="1w">1 Week</option>
        </select>
      </div>

      {/* Risk Slider */}
      <div className="space-y-2">
        <label className="text-white text-sm font-semibold">Risk Tolerance: {risk}%</label>
        <input
          type="range"
          min="0"
          max="100"
          value={risk}
          onChange={(e) => setRisk(parseInt(e.target.value))}
          className="w-full h-2 bg-[#1a1a1a] rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
      </div>

      {/* Run Signal Button */}
      <button
        onClick={handleRunSignal}
        disabled={loading}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        <Zap className="w-5 h-5" />
        {loading ? 'Analyzing...' : 'Run Signal'}
      </button>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && <Spinner />}

      {/* Rich Signal Card */}
      {signal && !loading && (
        <div className={`rounded-2xl border-2 overflow-hidden ${verdictStyle.border}`}>

          {/* Header — ticker + live price */}
          <div className="flex items-center justify-between px-5 py-4 bg-[#1a1a1a] border-b border-[#2a2a2a]">
            <div>
              <div className="text-2xl font-bold text-white">{tickerInput.toUpperCase()}</div>
              <div className="text-xs text-gray-400 mt-0.5">{signal.timeframe}</div>
            </div>
            {signal.entry != null && (
              <div className="text-right">
                <div className="text-lg font-semibold text-white">${Number(signal.entry).toFixed(2)}</div>
                <div className="text-xs text-gray-400">entry price</div>
              </div>
            )}
          </div>

          <div className="p-5 space-y-5">

            {/* Verdict + Overall Conviction */}
            <div className={`rounded-xl p-4 ${verdictStyle.bg}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-2xl font-extrabold tracking-wide ${verdictStyle.text}`}>
                  {signal.signal}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${verdictStyle.badgeBg}`}>
                  {overallConviction}% overall conviction
                </span>
              </div>
              <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${verdictStyle.badgeBg}`}
                  style={{ width: `${overallConviction}%` }}
                />
              </div>
            </div>

            {/* Conviction Stack */}
            <div className="rounded-xl border border-[#2a2a2a] overflow-hidden">
              <div className="px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
                <span className="text-white text-xs font-semibold uppercase tracking-wider">The Conviction Stack</span>
              </div>

              {/* AI Signal row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <div className="text-white text-sm font-medium">AI Signal</div>
                    <div className="text-gray-500 text-xs">{signal.signal} — model analysis</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm font-bold">{signal.conviction}%</div>
                  <div className="text-gray-500 text-xs">bullish</div>
                </div>
              </div>

              {/* Community row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-white text-sm font-medium">Community</div>
                    {communityData && communityData.holderCount > 0 ? (
                      <div className="text-gray-500 text-xs">{communityData.holderCount} trader{communityData.holderCount !== 1 ? 's' : ''} holding</div>
                    ) : (
                      <div className="text-gray-500 text-xs">Be the first to trade this</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {communityData ? (
                    <>
                      <div className="text-white text-sm font-bold">{communityData.bullishPct}%</div>
                      <div className="text-gray-500 text-xs">bullish</div>
                    </>
                  ) : (
                    <div className="text-gray-500 text-xs">—</div>
                  )}
                </div>
              </div>

              {/* Top Traders row */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                  <div>
                    <div className="text-white text-sm font-medium">Top Traders</div>
                    {topTradersData && topTradersData.topTraderCount > 0 ? (
                      <div className={`text-xs ${topTradersData.topTraderHolderCount > 0 ? 'text-gray-500' : 'text-gray-600'}`}>
                        {topTradersData.topTraderHolderCount} of {topTradersData.topTraderCount} top traders holding
                      </div>
                    ) : (
                      <div className="text-gray-600 text-xs">No top traders yet</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  {topTradersData && topTradersData.topTraderCount > 0 ? (
                    <>
                      <div className="text-white text-sm font-bold">{topTradersData.topTraderBullishPct}%</div>
                      <div className="text-gray-500 text-xs">bullish</div>
                    </>
                  ) : (
                    <div className="text-gray-500 text-xs">—</div>
                  )}
                </div>
              </div>
            </div>

            {/* Price Targets + R:R */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Entry</div>
                <div className="text-white font-semibold text-sm">${Number(signal.entry).toFixed(2)}</div>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Target</div>
                <div className="text-emerald-400 font-semibold text-sm">${Number(signal.target).toFixed(2)}</div>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Stop</div>
                <div className="text-red-400 font-semibold text-sm">${Number(signal.stop).toFixed(2)}</div>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">R:R</div>
                <div className="text-blue-400 font-semibold text-sm">
                  {signal.riskReward != null ? `${signal.riskReward}x` : '—'}
                </div>
              </div>
            </div>

            {/* Scorecard */}
            {scorecardDimensions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Scorecard</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    signal.scorecard.risk === 'Low'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : signal.scorecard.risk === 'High'
                      ? 'bg-red-500/20 text-red-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {signal.scorecard.risk} Risk
                  </span>
                </div>
                {scorecardDimensions.map(({ label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs w-24 shrink-0">{label}</span>
                    <div className="flex-1 bg-[#1a1a1a] rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-emerald-500"
                        style={{ width: `${value * 10}%` }}
                      />
                    </div>
                    <span className="text-gray-300 text-xs w-5 text-right">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bull Case */}
            {signal.bullCase?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Bull Case</span>
                </div>
                {signal.bullCase.map((point, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm">{point}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bear Case */}
            {signal.bearCase?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Bear Case</span>
                </div>
                {signal.bearCase.map((point, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm">{point}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Timeframe + Catalyst */}
            {(signal.timeframe || signal.catalyst) && (
              <div className="grid grid-cols-2 gap-3">
                {signal.timeframe && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <div className="text-xs text-gray-400 mb-1">Timeframe</div>
                    <div className="text-white text-sm font-medium">{signal.timeframe}</div>
                  </div>
                )}
                {signal.catalyst && (
                  <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                    <div className="text-xs text-gray-400 mb-1">Catalyst</div>
                    <div className="text-white text-sm font-medium">{signal.catalyst}</div>
                  </div>
                )}
              </div>
            )}

            {/* Collapsible Full Analysis + Community button row */}
            <div className="grid grid-cols-2 gap-2">
              {signal.fullAnalysis && (
                <div className="border border-[#2a2a2a] rounded-lg overflow-hidden col-span-1">
                  <button
                    onClick={() => setShowFullAnalysis(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] transition text-left"
                  >
                    <span className="text-white text-xs font-semibold uppercase tracking-wider">Full Analysis</span>
                    {showFullAnalysis
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </button>
                  {showFullAnalysis && (
                    <div className="px-4 py-3 bg-[#0f0f0f]">
                      <p className="text-gray-300 text-sm leading-relaxed">{signal.fullAnalysis}</p>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowCommunityModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] rounded-lg transition col-span-1"
              >
                <Users className="w-4 h-4 text-emerald-400" />
                <span className="text-white text-xs font-semibold uppercase tracking-wider">Community</span>
              </button>
            </div>

            {/* Community Modal */}
            {showCommunityModal && (
              <CommunityModal ticker={tickerInput} onClose={() => setShowCommunityModal(false)} />
            )}

            {/* Buy Button */}
            {signal.signal === 'BUY' && !lowConviction ? (
              <button
                onClick={handlePlaceTrade}
                disabled={tradeLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
              >
                {tradeLoading ? 'Placing Order...' : 'Buy with Alpaca'}
              </button>
            ) : lowConviction ? (
              <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 font-semibold py-3 rounded-lg text-center text-sm">
                Conviction too low — wait for a better setup.
              </div>
            ) : (
              <div className={`w-full text-center font-semibold py-3 rounded-lg text-sm ${
                signal.signal === 'SELL'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                  : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
              }`}>
                {signal.signal === 'SELL' ? 'Sell Signal — no paper short available' : 'Hold — no action recommended'}
              </div>
            )}

          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold flex items-center gap-2">
            <Check className="w-4 h-4" />
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}

// Main App Component
export default function App() {
  const [activeTab, setActiveTab] = useState('portfolio')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewingProfileId, setViewingProfileId] = useState(null)
  const [portfolioRefreshTrigger, setPortfolioRefreshTrigger] = useState(0)

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthSuccess = () => {
    // User will be set by the auth state change listener
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleUserClick = (userId) => {
    setViewingProfileId(userId)
    setActiveTab('profile')
  }

  const renderScreen = () => {
    if (viewingProfileId) {
      return (
        <Profile
          userId={viewingProfileId}
          currentUser={user}
          onBack={() => {
            setViewingProfileId(null)
            setActiveTab('feed')
          }}
        />
      )
    }

    switch (activeTab) {
      case 'portfolio':
        return <PortfolioScreen onLogout={handleLogout} refreshTrigger={portfolioRefreshTrigger} />
      case 'feed':
        return <FeedScreen onUserClick={handleUserClick} setPortfolioRefreshTrigger={setPortfolioRefreshTrigger} />
      case 'ai':
        return <AITraderScreen onTradeSuccess={() => setPortfolioRefreshTrigger(prev => prev + 1)} />
      case 'funds':
        return <FundsScreen user={user} />
      case 'profile':
        return user ? (
          <Profile
            userId={user.id}
            currentUser={user}
            onBack={() => setActiveTab('portfolio')}
          />
        ) : null
      default:
        return <PortfolioScreen onLogout={handleLogout} />
    }
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#2a2a2a] border-t-emerald-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  // Show login screen if not authenticated
  if (!user) {
    return <Landing onAuthSuccess={handleAuthSuccess} />
  }
  
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Main Content - Centered on Desktop */}
      <div className="mx-auto max-w-2xl h-screen flex flex-col border-x border-[#2a2a2a]">
        {/* Header */}
        <div className="bg-[#0f0f0f] border-b border-[#2a2a2a] p-4 sticky top-0 z-10">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
            Conviction
          </div>
          <p className="text-gray-500 text-xs mt-1">Trade with Conviction</p>
        </div>
        
        {/* Screen Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderScreen()}
        </div>
        
        {/* Bottom Navigation */}
        <div className="border-t border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4 grid grid-cols-5 gap-2 sticky bottom-0">
          {[
            { id: 'portfolio', label: 'Portfolio', Icon: LayoutDashboard },
            { id: 'feed', label: 'Feed', Icon: Rss },
            { id: 'ai', label: 'AI Trader', Icon: Bot },
            { id: 'funds', label: 'Funds', Icon: Briefcase },
            { id: 'profile', label: 'Profile', Icon: User }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'profile') {
                  setViewingProfileId(null)
                }
                setActiveTab(tab.id)
              }}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg transition ${
                activeTab === tab.id || (tab.id === 'profile' && viewingProfileId === user?.id)
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <tab.Icon className="w-5 h-5 mb-1" />
              <div className="text-xs font-semibold">{tab.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

