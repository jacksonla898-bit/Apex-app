import { useState, useEffect, useRef, useCallback } from 'react'
import './App.css'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { supabase, recordTrade } from './supabaseClient'
import Landing from './Landing'
import Profile from './Profile'
import FeedScreen from './Feed'
import FundsScreen from './Funds'
import LeaderboardScreen from './Leaderboard'
import { TopTradersContext, TopTraderBadge } from './TopTradersContext'
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
  Trophy,
  Shield,
  Star,
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


// Sell Modal
const SellModal = ({ symbol, sharesOwned, currentPrice, onClose, onSold }) => {
  const [qty, setQty]           = useState(1)
  const [sentiment, setSentiment] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const sentimentOptions = [
    { value: 'high',    icon: <Zap className="w-5 h-5 text-yellow-400" />,   label: 'Taking profits',   subtitle: 'Strong conviction exit' },
    { value: 'regular', icon: <Check className="w-5 h-5 text-emerald-400" />, label: 'Regular sell',     subtitle: 'Standard exit' },
    { value: 'test',    icon: <Activity className="w-5 h-5 text-blue-400" />, label: 'Trimming',         subtitle: 'Reducing exposure' },
  ]

  const handleSell = async () => {
    if (!sentiment) { setError('Pick a conviction level.'); return }
    setError(null)
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      const response = await fetch('/api/trade', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: symbol,
          qty,
          side:   'sell',
          userId,
          price:  currentPrice,
        }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Sell failed')
      }

      // Record in Supabase with sentiment
      await recordTrade({ symbol, side: 'sell', quantity: qty, price: currentPrice, sentiment })

      onSold()
      onClose()
    } catch (err) {
      setError(err.message)
      console.error('Sell error:', err)
    } finally {
      setLoading(false)
    }
  }

  const proceeds = (qty * (currentPrice || 0))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl border-t border-[#2a2a2a] p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-lg">{symbol}</div>
            <div className="text-gray-400 text-xs">
              {sharesOwned} shares owned · ${Number(currentPrice).toFixed(2)} current price
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <label className="text-white text-sm font-semibold">Quantity</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-white font-bold transition"
            >−</button>
            <input
              type="number"
              min={1}
              max={sharesOwned}
              value={qty}
              onChange={e => setQty(Math.min(sharesOwned, Math.max(1, parseInt(e.target.value) || 1)))}
              className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] text-white text-center px-4 py-2 rounded-lg"
            />
            <button
              onClick={() => setQty(q => Math.min(sharesOwned, q + 1))}
              className="w-10 h-10 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-white font-bold transition"
            >+</button>
          </div>
          <div className="flex justify-between text-xs text-gray-500 pt-1">
            <span>Proceeds: <span className="text-emerald-400 font-semibold">${proceeds.toFixed(2)}</span></span>
            <button onClick={() => setQty(sharesOwned)} className="text-emerald-400 hover:underline">Sell all</button>
          </div>
        </div>

        {/* Sentiment */}
        <div className="space-y-2">
          <div className="text-white text-sm font-semibold">Why are you selling?</div>
          {sentimentOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSentiment(opt.value)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition text-left ${
                sentiment === opt.value
                  ? 'border-red-500/60 bg-red-500/10'
                  : 'border-[#2a2a2a] bg-[#0f0f0f] hover:bg-[#1a1a1a]'
              }`}
            >
              {opt.icon}
              <div>
                <div className="text-white font-semibold text-sm">{opt.label}</div>
                <div className="text-gray-500 text-xs">{opt.subtitle}</div>
              </div>
            </button>
          ))}
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
          onClick={handleSell}
          disabled={loading || !sentiment}
          className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? 'Placing Order...' : `Confirm Sell · ${qty} share${qty > 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  )
}

// Exit Signal Modal
const ExitSignalModal = ({ symbol, userId, currentPrice, onClose, onSell }) => {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    fetch('/api/exit-signal', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ symbol, userId }),
    })
      .then(r => r.ok ? r.json() : r.json().then(b => Promise.reject(b.error || 'Failed')))
      .then(setData)
      .catch(e => setError(typeof e === 'string' ? e : 'Failed to load exit signal'))
      .finally(() => setLoading(false))
  }, [symbol, userId])

  const actionStyle = data
    ? data.action === 'SELL'
      ? { text: 'text-red-400',    badge: 'bg-red-500',     border: 'border-red-500/40',    bg: 'bg-red-500/10' }
      : data.action === 'TRIM'
      ? { text: 'text-yellow-400', badge: 'bg-yellow-500',  border: 'border-yellow-500/40', bg: 'bg-yellow-500/10' }
      : { text: 'text-emerald-400', badge: 'bg-emerald-500', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' }
    : null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f0f0f]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2a2a] bg-[#1a1a1a] shrink-0">
        <div>
          <div className="text-white font-bold text-lg">{symbol}</div>
          <div className="text-gray-400 text-xs">AI Exit Analysis</div>
        </div>
        <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#2a2a2a] transition">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {loading && <Spinner />}
        {error && <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-300 text-sm">{error}</div>}

        {data && (
          <>
            {/* Entry vs Current + P&L */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Entry</div>
                <div className="text-white font-semibold text-sm">${data.avgEntryPrice.toFixed(2)}</div>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Current</div>
                <div className="text-white font-semibold text-sm">${data.currentPrice.toFixed(2)}</div>
              </div>
              <div className={`bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center`}>
                <div className="text-xs text-gray-400 mb-1">P&L</div>
                <div className={`font-semibold text-sm ${data.currentPnl.dollars >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {data.currentPnl.dollars >= 0 ? '+' : ''}{data.currentPnl.percent.toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Action + conviction */}
            <div className={`rounded-xl p-4 ${actionStyle.bg} border ${actionStyle.border}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-2xl font-extrabold tracking-wide ${actionStyle.text}`}>
                  {data.action}
                </span>
                <span className={`text-xs font-bold px-3 py-1 rounded-full text-white ${actionStyle.badge}`}>
                  {data.conviction}% conviction
                </span>
              </div>
              <div className="w-full bg-[#0f0f0f] rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${actionStyle.badge}`}
                  style={{ width: `${data.conviction}%` }} />
              </div>
            </div>

            {/* Target + Stop */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Target</div>
                <div className="text-emerald-400 font-semibold text-sm">${Number(data.target).toFixed(2)}</div>
              </div>
              <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Stop</div>
                <div className="text-red-400 font-semibold text-sm">${Number(data.stop).toFixed(2)}</div>
              </div>
            </div>

            {/* Reasons to hold */}
            {data.reasonsToHold?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Reasons to Hold</span>
                </div>
                {data.reasonsToHold.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm">{r}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Reasons to sell */}
            {data.reasonsToSell?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-white text-xs font-semibold uppercase tracking-wider">Reasons to Exit</span>
                </div>
                {data.reasonsToSell.map((r, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 mt-0.5 shrink-0" />
                    <span className="text-gray-300 text-sm">{r}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Timeframe + Catalyst */}
            <div className="grid grid-cols-2 gap-3">
              {data.timeframe && (
                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                  <div className="text-xs text-gray-400 mb-1">Timeframe</div>
                  <div className="text-white text-sm font-medium">{data.timeframe}</div>
                </div>
              )}
              {data.catalyst && (
                <div className="bg-[#1a1a1a] rounded-lg p-3 border border-[#2a2a2a]">
                  <div className="text-xs text-gray-400 mb-1">Catalyst</div>
                  <div className="text-white text-sm font-medium">{data.catalyst}</div>
                </div>
              )}
            </div>

            {/* Full Analysis */}
            {data.fullAnalysis && (
              <div className="bg-[#1a1a1a] rounded-lg p-4 border border-[#2a2a2a]">
                <div className="text-gray-500 text-xs uppercase tracking-wider mb-2">Full Analysis</div>
                <p className="text-gray-300 text-sm leading-relaxed">{data.fullAnalysis}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-2 pb-4">
              {(data.action === 'SELL' || data.action === 'TRIM') && (
                <button
                  onClick={() => { onClose(); onSell(symbol, Math.floor(data.qty), data.currentPrice) }}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition"
                >
                  {data.action === 'TRIM' ? `Trim position — open sell` : `Sell ${symbol}`}
                </button>
              )}
              <button
                onClick={onClose}
                className="w-full py-3 rounded-lg border border-[#2a2a2a] text-gray-400 text-sm font-semibold hover:bg-[#1a1a1a] transition"
              >
                Keep holding
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Portfolio Screen
const TIMEFRAMES = ['1D', '1W', '1M', '3M', '1Y', 'ALL']
const STARTING_EQUITY = 10000

const PortfolioScreen = ({ onLogout, refreshTrigger }) => {
  const [positions, setPositions]         = useState([])
  const [prices, setPrices]               = useState({})
  const [cash, setCash]                   = useState(0)
  const [positionsValue, setPositionsValue] = useState(0)
  const [totalEquity, setTotalEquity]     = useState(0)
  const [totalPnl, setTotalPnl]           = useState(0)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [sellTarget, setSellTarget]       = useState(null)
  const [exitBadges, setExitBadges]       = useState({})
  const [exitTarget, setExitTarget]       = useState(null)
  const [badgesLoading, setBadgesLoading] = useState(false)
  const [timeframe, setTimeframe]         = useState('1W')
  const [history, setHistory]             = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => {
    loadPortfolio()
  }, [refreshTrigger])

  useEffect(() => {
    if (!currentUserId) return
    loadHistory(currentUserId, timeframe)
  }, [currentUserId, timeframe])

  const loadHistory = async (userId, tf) => {
    setHistoryLoading(true)
    try {
      const res = await fetch('/api/equity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, timeframe: tf }),
      })
      if (res.ok) {
        const { history: h } = await res.json()
        setHistory(h || [])
      }
    } catch (err) {
      console.error('equity-history fetch error:', err)
    } finally {
      setHistoryLoading(false)
    }
  }

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

      setCurrentUserId(session.user.id)
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

      // Fetch batch exit badges (non-blocking)
      if ((raw || []).length > 0) {
        setBadgesLoading(true)
        fetch('/api/portfolio-exit-signals', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ userId: session.user.id }),
        })
          .then(r => r.ok ? r.json() : {})
          .then(setExitBadges)
          .catch(() => {})
          .finally(() => setBadgesLoading(false))
      }
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
        {/* Equity History Chart */}
        <div className="mt-6">
          {/* Timeframe pills */}
          <div className="flex gap-1.5 mb-3">
            {TIMEFRAMES.map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition border ${
                  timeframe === tf
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#0f0f0f] border-[#2a2a2a] text-gray-500 hover:text-gray-300'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {historyLoading ? (
            <div className="h-28 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="h-28 flex items-center justify-center">
              <p className="text-gray-600 text-xs text-center">Place your first trade to see your equity history.</p>
            </div>
          ) : (
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(ts) => {
                      const d = new Date(ts)
                      if (timeframe === '1D') return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      if (timeframe === '1Y' || timeframe === 'ALL') return d.toLocaleDateString([], { month: 'short', year: '2-digit' })
                      return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
                    }}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
                    tick={{ fill: '#6b7280', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    contentStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: totalEquity >= STARTING_EQUITY ? '#10b981' : '#ef4444' }}
                    labelFormatter={(ts) => new Date(ts).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    formatter={(v) => [`$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Equity']}
                  />
                  <ReferenceLine y={STARTING_EQUITY} stroke="#374151" strokeDasharray="3 3" />
                  <Line
                    type="monotone"
                    dataKey="totalEquity"
                    stroke={totalEquity >= STARTING_EQUITY ? '#10b981' : '#ef4444'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
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
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold text-white text-base">{position.symbol}</div>
                          {/* Exit badge */}
                          {exitBadges[position.symbol] && (() => {
                            const b = exitBadges[position.symbol]
                            const dot = b.action === 'SELL' ? 'bg-red-500' : b.action === 'TRIM' ? 'bg-yellow-500' : 'bg-emerald-500'
                            const lbl = b.action === 'SELL' ? 'text-red-400' : b.action === 'TRIM' ? 'text-yellow-400' : 'text-emerald-400'
                            return (
                              <span className={`flex items-center gap-1 text-xs font-semibold ${lbl}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                                {b.action}
                              </span>
                            )
                          })()}
                          {badgesLoading && !exitBadges[position.symbol] && (
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-600 animate-pulse" />
                          )}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                          {position.qty % 1 === 0 ? position.qty : position.qty.toFixed(4)} shares @ ${fmt(position.avgEntryPrice)}
                        </div>
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
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-gray-500 text-xs">Unrealized P&L</div>
                        <div className={`text-sm font-bold ${isGain ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isGain ? '+' : ''}${fmt(pl)}{' '}
                          <span className="text-xs font-semibold">
                            ({isGain ? '+' : ''}{plPct.toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          const { data: { session } } = await supabase.auth.getSession()
                          setExitTarget({ symbol: position.symbol, currentPrice, userId: session?.user?.id })
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-xs font-semibold transition whitespace-nowrap"
                      >
                        AI Analysis
                      </button>
                      <button
                        onClick={() => setSellTarget({ symbol: position.symbol, sharesOwned: Math.floor(position.qty), currentPrice })}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-semibold transition"
                      >
                        Sell
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sell Modal */}
      {sellTarget && (
        <SellModal
          symbol={sellTarget.symbol}
          sharesOwned={sellTarget.sharesOwned}
          currentPrice={sellTarget.currentPrice}
          onClose={() => setSellTarget(null)}
          onSold={() => { setSellTarget(null); loadPortfolio() }}
        />
      )}

      {/* Exit Signal Modal */}
      {exitTarget && (
        <ExitSignalModal
          symbol={exitTarget.symbol}
          userId={exitTarget.userId}
          currentPrice={exitTarget.currentPrice}
          onClose={() => setExitTarget(null)}
          onSell={(sym, shares, price) => {
            setExitTarget(null)
            setSellTarget({ symbol: sym, sharesOwned: shares, currentPrice: price })
          }}
        />
      )}
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
  const [usernameMap, setUsernameMap] = useState({})

  useEffect(() => {
    fetch(`/api/community-details?symbol=${encodeURIComponent(ticker)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(d => {
        setData(d)
        // Collect all unique userIds to resolve
        const ids = new Set()
        d.allHolders?.forEach(h => ids.add(h.userId))
        d.whales?.forEach(w => ids.add(w.userId))
        d.recentActivity?.forEach(t => ids.add(t.userId))
        if (ids.size > 0) {
          fetch('/api/usernames', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ userIds: [...ids] }),
          })
            .then(r => r.ok ? r.json() : {})
            .then(map => setUsernameMap(map))
            .catch(() => {})
        }
      })
      .catch(() => setError('Failed to load community data'))
      .finally(() => setLoading(false))
  }, [ticker])

  const displayName = (userId) =>
    usernameMap[userId] ? `@${usernameMap[userId]}` : `${userId.slice(0, 8)}…`

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

            {/* Sentiment breakdown */}
            {data.sentimentBreakdown && (
              <div className="flex flex-wrap gap-3 text-xs">
                {data.sentimentBreakdown.high > 0 && (
                  <span className="flex items-center gap-1 text-yellow-400">
                    <Zap className="w-3 h-3" />{data.sentimentBreakdown.high} high conviction
                  </span>
                )}
                {data.sentimentBreakdown.regular > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" />{data.sentimentBreakdown.regular} regular
                  </span>
                )}
                {data.sentimentBreakdown.test > 0 && (
                  <span className="flex items-center gap-1 text-blue-400">
                    <Activity className="w-3 h-3" />{data.sentimentBreakdown.test} test
                  </span>
                )}
                {data.sentimentBreakdown.unknown > 0 && (
                  <span className="text-gray-500">{data.sentimentBreakdown.unknown} untagged</span>
                )}
                {data.holderCount === 0 && (
                  <span className="text-gray-500">No positions yet</span>
                )}
              </div>
            )}

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
                          <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                            {displayName(h.userId)}
                            <TopTraderBadge userId={h.userId} />
                          </div>
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
                        <div className="flex items-center gap-1.5 text-white text-sm font-semibold">
                          {displayName(w.userId)}
                          <TopTraderBadge userId={w.userId} />
                        </div>
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
                        <span className="flex items-center gap-1 text-gray-300 text-xs font-semibold">
                          {displayName(t.userId)}
                          <TopTraderBadge userId={t.userId} />
                        </span>
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

// Buy Modal
const BuyModal = ({ symbol, price, cash, onClose, onBought }) => {
  const maxQty    = Math.max(1, Math.floor(cash / Math.max(price, 0.01)))
  const [qty, setQty]           = useState(1)
  const [sentiment, setSentiment] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  const sentimentOptions = [
    { value: 'high',    icon: <Zap className="w-5 h-5 text-yellow-400" />,   label: 'High conviction',      subtitle: 'Strong signal, sizing up' },
    { value: 'regular', icon: <Check className="w-5 h-5 text-emerald-400" />, label: 'Regular buy',          subtitle: 'Standard position' },
    { value: 'test',    icon: <Activity className="w-5 h-5 text-blue-400" />, label: 'Small test position',  subtitle: 'Testing the thesis' },
  ]

  const totalCost = qty * (price || 0)

  const handleBuy = async () => {
    if (!sentiment) { setError('Pick a conviction level.'); return }
    setError(null)
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      const response = await fetch('/api/trade', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol, qty, side: 'buy', userId, price }),
      })

      if (!response.ok) {
        const body = await response.json()
        throw new Error(body.error || 'Buy failed')
      }

      if (price > 0) {
        await recordTrade({ symbol, side: 'buy', quantity: qty, price, sentiment })
      }

      onBought()
      onClose()
    } catch (err) {
      setError(err.message)
      console.error('Buy error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70">
      <div className="w-full max-w-lg bg-[#1a1a1a] rounded-t-2xl border-t border-[#2a2a2a] p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white font-bold text-lg">{symbol}</div>
            <div className="text-gray-400 text-xs">
              ${Number(price).toFixed(2)} · <span className="text-emerald-400">${Number(cash).toLocaleString('en-US', { maximumFractionDigits: 2 })} available</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#2a2a2a] rounded-lg transition">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <label className="text-white text-sm font-semibold">Quantity</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-10 h-10 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-white font-bold transition"
            >−</button>
            <input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={e => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
              className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] text-white text-center px-4 py-2 rounded-lg"
            />
            <button
              onClick={() => setQty(q => Math.min(maxQty, q + 1))}
              className="w-10 h-10 rounded-lg bg-[#2a2a2a] hover:bg-[#333] text-white font-bold transition"
            >+</button>
          </div>
          <div className="flex justify-between text-xs text-gray-500 pt-1">
            <span>Total cost: <span className="text-white font-semibold">${totalCost.toFixed(2)}</span></span>
            <button onClick={() => setQty(maxQty)} className="text-emerald-400 hover:underline">Max ({maxQty})</button>
          </div>
        </div>

        {/* Sentiment */}
        <div className="space-y-2">
          <div className="text-white text-sm font-semibold">What's your conviction?</div>
          {sentimentOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setSentiment(opt.value)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition text-left ${
                sentiment === opt.value
                  ? 'border-emerald-500/60 bg-emerald-500/10'
                  : 'border-[#2a2a2a] bg-[#0f0f0f] hover:bg-[#1a1a1a]'
              }`}
            >
              {opt.icon}
              <div>
                <div className="text-white font-semibold text-sm">{opt.label}</div>
                <div className="text-gray-500 text-xs">{opt.subtitle}</div>
              </div>
            </button>
          ))}
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
          onClick={handleBuy}
          disabled={loading || !sentiment}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
        >
          {loading ? 'Placing Order...' : `Confirm Buy · ${qty} share${qty > 1 ? 's' : ''} · $${totalCost.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}

// Low-conviction warning modal
const LowConvictionWarning = ({ conviction, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
    <div className="w-full max-w-sm bg-[#1a1a1a] rounded-2xl border border-yellow-500/40 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-yellow-400 shrink-0" />
        <div className="text-white font-bold text-base">Weak signal</div>
      </div>
      <p className="text-gray-300 text-sm leading-relaxed">
        The AI doesn't recommend this trade. Conviction is only <span className="text-yellow-400 font-semibold">{conviction}%</span>. Are you sure you want to proceed?
      </p>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-lg border border-[#2a2a2a] text-gray-400 text-sm font-semibold hover:bg-[#2a2a2a] transition"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-lg bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 text-sm font-semibold hover:bg-yellow-500/30 transition"
        >
          Yes, I understand
        </button>
      </div>
    </div>
  </div>
)

// AI Trader Screen
const AITraderScreen = ({ onTradeSuccess, initialTicker = null }) => {
  const [tickerInput, setTickerInput] = useState(initialTicker || 'AAPL')
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
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [showLowConvWarning, setShowLowConvWarning] = useState(false)
  const [userPositions, setUserPositions] = useState([])
  const [userCash, setUserCash] = useState(10000)
  const [sellTarget, setSellTarget] = useState(null)

  const popularTickers = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'SPY', 'AMD', 'GOOGL', 'BTC-USD', 'ETH-USD', 'NFLX']

  const handleRunSignal = async () => {
    setLoading(true)
    setError(null)
    setSignal(null)
    setCommunityData(null)
    setTopTradersData(null)
    setShowFullAnalysis(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      const [signalRes, communityRes, topTradersRes, portfolioRes] = await Promise.all([
        fetch('/api/signal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: tickerInput, timeframe, risk })
        }),
        fetch(`/api/community-conviction?symbol=${encodeURIComponent(tickerInput)}`),
        fetch(`/api/top-traders?symbol=${encodeURIComponent(tickerInput)}`),
        session?.user?.id
          ? fetch('/api/user-portfolio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: session.user.id }),
            })
          : Promise.resolve(null),
      ])

      if (!signalRes.ok) {
        throw new Error('Failed to generate signal')
      }

      const [signalData, communityJson, topTradersJson, portfolioJson] = await Promise.all([
        signalRes.json(),
        communityRes.ok ? communityRes.json() : null,
        topTradersRes.ok ? topTradersRes.json() : null,
        portfolioRes?.ok ? portfolioRes.json() : null,
      ])

      setSignal(signalData)
      setCommunityData(communityJson)
      setTopTradersData(topTradersJson)
      setUserPositions(portfolioJson?.positions ?? [])
      setUserCash(portfolioJson?.cash ?? 10000)
    } catch (err) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceTrade = async (sentiment, qty = 1) => {
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
          qty,
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

      if (entryPrice > 0) {
        await recordTrade({ symbol: tickerInput, side: 'buy', quantity: qty, price: entryPrice, sentiment })
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

            {/* Primary action */}
            {signal.signal === 'BUY' && !lowConviction ? (
              <button
                onClick={() => setShowBuyModal(true)}
                disabled={tradeLoading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
              >
                {tradeLoading ? 'Placing Order...' : 'Buy with Alpaca'}
              </button>
            ) : signal.signal === 'SELL' ? (() => {
              const held = userPositions.find(p => p.symbol === tickerInput.toUpperCase())
              return (
                <div className="space-y-2">
                  {held ? (
                    <button
                      onClick={() => setSellTarget({ symbol: held.symbol, sharesOwned: Math.floor(held.qty), currentPrice: signal.entry })}
                      disabled={tradeLoading}
                      className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
                    >
                      Sell {held.symbol} with Alpaca
                    </button>
                  ) : (
                    <div className="w-full text-center font-semibold py-3 rounded-lg text-sm bg-red-500/10 text-red-400 border border-red-500/30">
                      Sell Signal — you don't hold {tickerInput.toUpperCase()}
                    </div>
                  )}
                  <button
                    onClick={() => setShowLowConvWarning(true)}
                    className="w-full py-2.5 rounded-lg border border-[#2a2a2a] text-gray-500 text-sm font-semibold hover:text-gray-300 hover:border-[#3a3a3a] transition"
                  >
                    Buy anyway
                  </button>
                </div>
              )
            })() : (
              <div className="space-y-2">
                {lowConviction ? (
                  <div className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-gray-500 text-sm text-center py-3 rounded-lg">
                    AI conviction only {signal.conviction}% — weak setup
                  </div>
                ) : (
                  <div className="w-full text-center font-semibold py-3 rounded-lg text-sm bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
                    Hold — no action recommended
                  </div>
                )}
                <button
                  onClick={() => setShowLowConvWarning(true)}
                  className="w-full py-2.5 rounded-lg border border-[#2a2a2a] text-gray-500 text-sm font-semibold hover:text-gray-300 hover:border-[#3a3a3a] transition"
                >
                  Buy anyway
                </button>
              </div>
            )}

            {/* Modals */}
            {showBuyModal && (
              <BuyModal
                symbol={tickerInput.toUpperCase()}
                price={Number(signal.entry)}
                cash={userCash}
                onClose={() => setShowBuyModal(false)}
                onBought={() => { setShowBuyModal(false); setToast(`Bought ${tickerInput.toUpperCase()}`); if (onTradeSuccess) onTradeSuccess() }}
              />
            )}
            {showLowConvWarning && (
              <LowConvictionWarning
                conviction={signal.conviction}
                onCancel={() => setShowLowConvWarning(false)}
                onConfirm={() => { setShowLowConvWarning(false); setShowBuyModal(true) }}
              />
            )}
            {sellTarget && (
              <SellModal
                symbol={sellTarget.symbol}
                sharesOwned={sellTarget.sharesOwned}
                currentPrice={sellTarget.currentPrice}
                onClose={() => setSellTarget(null)}
                onSold={() => { setSellTarget(null); if (onTradeSuccess) onTradeSuccess() }}
              />
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

// Onboarding Flow
// Reusable username picker — used in onboarding step AND standalone modal
const UsernamePickerStep = ({ userId, onDone, isModal = false }) => {
  const [value, setValue]       = useState('')
  const [status, setStatus]     = useState(null) // null | 'checking' | 'ok' | string(error)
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef(null)

  const check = useCallback((username) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const validationRe = /^[a-zA-Z0-9_]{3,20}$/
    if (!username) { setStatus(null); return }
    if (!validationRe.test(username)) {
      setStatus(username.length < 3 ? 'At least 3 characters' : username.length > 20 ? 'Max 20 characters' : 'Letters, numbers, underscores only')
      return
    }
    setStatus('checking')
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch('/api/usernames', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ username, checkOnly: true }),
        })
        const body = await res.json()
        setStatus(res.ok ? 'ok' : (body.error || 'Unavailable'))
      } catch {
        setStatus('Could not check availability')
      }
    }, 400)
  }, [])

  const handleChange = (e) => {
    const v = e.target.value
    setValue(v)
    check(v)
  }

  const handleSubmit = async () => {
    if (status !== 'ok' || submitting) return
    setSubmitting(true)
    try {
      const res  = await fetch('/api/usernames', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId, username: value }),
      })
      const body = await res.json()
      if (!res.ok) { setStatus(body.error || 'Failed to save'); setSubmitting(false); return }
      onDone(value)
    } catch {
      setStatus('Failed to save username')
      setSubmitting(false)
    }
  }

  const indicator = () => {
    if (!value) return null
    if (status === 'checking') return <span className="text-gray-400 text-xs">Checking…</span>
    if (status === 'ok')       return <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" />Available</span>
    if (status)                return <span className="text-red-400 text-xs">{status}</span>
    return null
  }

  const content = (
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div>
          <h2 className="text-white font-bold text-2xl mb-2">Pick your username</h2>
          <p className="text-gray-400 text-sm">This is how other traders will see you.</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold select-none">@</span>
            <input
              type="text"
              value={value}
              onChange={handleChange}
              placeholder="yourname"
              maxLength={20}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] focus:border-emerald-500/60 outline-none text-white pl-8 pr-4 py-4 rounded-xl text-base transition"
            />
          </div>
          <div className="h-5 flex items-center">{indicator()}</div>
          <p className="text-gray-600 text-xs">3–20 characters. Letters, numbers, underscores only.</p>
        </div>
      </div>
      <button
        onClick={handleSubmit}
        disabled={status !== 'ok' || submitting}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition text-base"
      >
        {submitting ? 'Saving…' : 'Continue'}
      </button>
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0f0f0f] flex flex-col">
        <div className="mx-auto max-w-lg w-full flex-1 flex flex-col px-6 pt-16 pb-10">
          {content}
        </div>
      </div>
    )
  }

  return content
}

const OnboardingFlow = ({ userId, onComplete }) => {
  const [step, setStep] = useState(1)
  const [agreed, setAgreed] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [username, setUsername] = useState(null)

  const STOCKS = [
    { symbol: 'AAPL',  name: 'Apple Inc.' },
    { symbol: 'TSLA',  name: 'Tesla, Inc.' },
    { symbol: 'NVDA',  name: 'NVIDIA Corporation' },
  ]

  const finish = async (ticker = null) => {
    setCompleting(true)
    try {
      await fetch('/api/complete-onboarding', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ userId }),
      })
    } catch (e) {
      console.error('complete-onboarding error:', e)
    } finally {
      onComplete(ticker)
    }
  }

  const stepWrap = (content) => (
    <div className="min-h-screen bg-[#0f0f0f] flex flex-col">
      <div className="mx-auto max-w-lg w-full flex-1 flex flex-col px-6 pt-16 pb-10">
        {/* Progress dots */}
        <div className="flex gap-2 mb-12 justify-center">
          {[1, 2, 3, 4, 5].map(s => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${s === step ? 'w-8 bg-emerald-500' : s < step ? 'w-4 bg-emerald-500/50' : 'w-4 bg-[#2a2a2a]'}`}
            />
          ))}
        </div>
        {content}
      </div>
    </div>
  )

  if (step === 1) return stepWrap(
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center space-y-8">
        <div className="space-y-4">
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
            Conviction
          </div>
          <p className="text-2xl font-bold text-white leading-snug">
            Trade with conviction,<br />backed by AI.
          </p>
          <p className="text-gray-400 text-base leading-relaxed">
            Analyze any stock in seconds, see what the crowd is holding, and make smarter paper trades with real market data.
          </p>
        </div>
      </div>
      <button
        onClick={() => setStep(2)}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition text-base"
      >
        Get started
      </button>
    </div>
  )

  if (step === 2) return stepWrap(
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Shield className="w-7 h-7 text-yellow-400 shrink-0" />
            <h2 className="text-white font-bold text-xl">This is paper trading</h2>
          </div>
          <p className="text-gray-300 text-sm leading-relaxed">
            You're starting with <span className="text-white font-semibold">$10,000 in virtual cash</span>. Trades use live market data but do not execute in real markets. This is for educational and simulation purposes only. No real money is at risk.
          </p>
        </div>
        <label className="flex items-start gap-3 cursor-pointer group">
          <div
            onClick={() => setAgreed(v => !v)}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition ${agreed ? 'bg-emerald-500 border-emerald-500' : 'border-[#3a3a3a] group-hover:border-emerald-500/50'}`}
          >
            {agreed && <Check className="w-3 h-3 text-white" />}
          </div>
          <span className="text-gray-300 text-sm leading-relaxed" onClick={() => setAgreed(v => !v)}>
            I understand this is paper trading and no real money is involved.
          </span>
        </label>
      </div>
      <button
        onClick={() => setStep(3)}
        disabled={!agreed}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition text-base"
      >
        Continue
      </button>
    </div>
  )

  if (step === 3) return stepWrap(
    <UsernamePickerStep
      userId={userId}
      onDone={(uname) => { setUsername(uname); setStep(4) }}
    />
  )

  if (step === 4) return stepWrap(
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div>
          <h2 className="text-white font-bold text-2xl mb-2">How it works</h2>
          <p className="text-gray-400 text-sm">Three tools in one app.</p>
        </div>
        <div className="space-y-3">
          {[
            {
              icon: <Bot className="w-6 h-6 text-emerald-400" />,
              title: 'AI Signal',
              body: 'AI analyzes stocks and tells you when to buy, with conviction scores and price targets.',
            },
            {
              icon: <Users className="w-6 h-6 text-blue-400" />,
              title: 'Community',
              body: 'See what other traders are holding and how they\'re positioned across the market.',
            },
            {
              icon: <Trophy className="w-6 h-6 text-yellow-400" />,
              title: 'Leaderboard',
              body: 'Compete with real performance metrics and see who\'s trading with the most conviction.',
            },
          ].map(card => (
            <div key={card.title} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] flex gap-4">
              <div className="shrink-0 mt-0.5">{card.icon}</div>
              <div>
                <div className="text-white font-semibold text-sm mb-1">{card.title}</div>
                <div className="text-gray-400 text-sm leading-relaxed">{card.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={() => setStep(5)}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl transition text-base"
      >
        Continue
      </button>
    </div>
  )

  // Step 5 — first action
  return stepWrap(
    <div className="flex flex-col flex-1">
      <div className="flex-1 flex flex-col justify-center space-y-6">
        <div>
          <h2 className="text-white font-bold text-2xl mb-2">Ready to start?</h2>
          <p className="text-gray-400 text-sm">Pick a stock and run your first AI analysis.</p>
        </div>
        <div className="space-y-3">
          {STOCKS.map(({ symbol, name }) => (
            <button
              key={symbol}
              onClick={() => finish(symbol)}
              disabled={completing}
              className="w-full bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] hover:border-emerald-500/40 rounded-xl p-4 text-left transition disabled:opacity-50 flex items-center justify-between group"
            >
              <div>
                <div className="text-white font-bold text-base">{symbol}</div>
                <div className="text-gray-500 text-sm">{name}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-600 group-hover:text-emerald-400 transition -rotate-90" />
            </button>
          ))}
        </div>
      </div>
      <button
        onClick={() => finish(null)}
        disabled={completing}
        className="w-full py-3 text-gray-500 text-sm hover:text-gray-300 transition disabled:opacity-50"
      >
        Skip for now
      </button>
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
  const [onboardingCompleted, setOnboardingCompleted] = useState(null) // null = not checked yet
  const [initialAiTicker, setInitialAiTicker] = useState(null)
  const [hasUsername, setHasUsername] = useState(null) // null = not checked yet
  const [topTraderIdsSet, setTopTraderIdsSet] = useState(new Set())

  useEffect(() => {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
        // Reset onboarding + username check on sign-out
        if (!session) { setOnboardingCompleted(null); setHasUsername(null) }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Check onboarding status once after user is confirmed
  useEffect(() => {
    if (!user) return
    setOnboardingCompleted(null) // show spinner while checking
    fetch('/api/user-portfolio', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userId: user.id }),
    })
      .then(r => r.ok ? r.json() : {})
      .then(data => setOnboardingCompleted(data.onboardingCompleted ?? false))
      .catch(() => setOnboardingCompleted(true)) // if check fails, don't block the app
  }, [user?.id])

  // Populate top trader IDs for badge system — refresh every 5 minutes
  useEffect(() => {
    if (!user) return
    const fetchIds = () => {
      fetch('/api/top-traders')
        .then(r => r.ok ? r.json() : {})
        .then(data => {
          if (data.topTraderIds) setTopTraderIdsSet(new Set(data.topTraderIds))
        })
        .catch(() => {})
    }
    fetchIds()
    const interval = setInterval(fetchIds, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Check if user has a username (for existing users who skipped onboarding)
  useEffect(() => {
    if (!user) return
    setHasUsername(null)
    fetch('/api/usernames', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ userIds: [user.id] }),
    })
      .then(r => r.ok ? r.json() : {})
      .then(map => setHasUsername(!!map[user.id]))
      .catch(() => setHasUsername(true)) // don't block on failure
  }, [user?.id])

  const handleAuthSuccess = () => {}

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleUserClick = (userId) => {
    setViewingProfileId(userId)
    setActiveTab('profile')
  }

  const handleOnboardingComplete = (ticker) => {
    setOnboardingCompleted(true)
    setHasUsername(true) // username was claimed during onboarding step 3
    if (ticker) {
      setInitialAiTicker(ticker)
      setActiveTab('ai')
    }
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
        return <AITraderScreen
          onTradeSuccess={() => setPortfolioRefreshTrigger(prev => prev + 1)}
          initialTicker={initialAiTicker}
        />
      case 'leaderboard':
        return <LeaderboardScreen user={user} />
      case 'funds':
        return <FundsScreen user={user} />
      case 'profile':
        return user ? (
          <Profile
            userId={user.id}
            currentUser={user}
            onBack={() => setActiveTab('portfolio')}
            onResetOnboarding={async () => {
              await fetch('/api/complete-onboarding', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ userId: user.id, reset: true }),
              })
              setOnboardingCompleted(false)
            }}
          />
        ) : null
      default:
        return <PortfolioScreen onLogout={handleLogout} />
    }
  }

  // Show loading spinner while checking authentication, onboarding status, or username
  if (loading || (user && (onboardingCompleted === null || hasUsername === null))) {
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

  // Show onboarding if not completed
  if (onboardingCompleted === false) {
    return <OnboardingFlow userId={user.id} onComplete={handleOnboardingComplete} />
  }

  // Existing users who never picked a username — show mandatory picker
  if (hasUsername === false) {
    return (
      <UsernamePickerStep
        userId={user.id}
        isModal={true}
        onDone={() => setHasUsername(true)}
      />
    )
  }
  
  return (
    <TopTradersContext.Provider value={topTraderIdsSet}>
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
        <div className="border-t border-[#2a2a2a] bg-[#0f0f0f] px-2 py-3 grid grid-cols-6 gap-1 sticky bottom-0">
          {[
            { id: 'portfolio',    label: 'Portfolio', Icon: LayoutDashboard },
            { id: 'feed',         label: 'Feed',      Icon: Rss },
            { id: 'ai',           label: 'AI',        Icon: Bot },
            { id: 'leaderboard',  label: 'Leaders',   Icon: Trophy },
            { id: 'funds',        label: 'Funds',     Icon: Briefcase },
            { id: 'profile',      label: 'Profile',   Icon: User },
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
    </TopTradersContext.Provider>
  )
}

