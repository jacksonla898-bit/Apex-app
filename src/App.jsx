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
  const [positions, setPositions] = useState([])
  const [prices, setPrices]       = useState({})   // symbol -> current price
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

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
      const { positions: raw } = await res.json()

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
    } catch (err) {
      console.error('Error loading portfolio:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fmt = (n) => Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const totalEquity = positions.reduce((sum, p) => {
    const currentPrice = prices[p.symbol] ?? p.avgEntryPrice
    return sum + p.qty * currentPrice
  }, 0)

  const totalCostBasis = positions.reduce((sum, p) => sum + p.costBasis, 0)
  const totalPL = totalEquity - totalCostBasis

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
        <p className="text-gray-400 text-sm mb-2">Total Portfolio Value</p>
        <div className="text-5xl font-bold text-white mb-2">
          ${fmt(totalEquity)}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-gray-400 text-xs">Cost Basis</p>
            <p className="text-white font-semibold">${fmt(totalCostBasis)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Total P&L</p>
            <p className={`font-semibold ${totalPL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {totalPL >= 0 ? '+' : ''}${fmt(totalPL)}
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

  const popularTickers = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'SPY', 'AMD', 'GOOGL', 'BTC-USD', 'ETH-USD', 'NFLX']

  const handleRunSignal = async () => {
    setLoading(true)
    setError(null)
    setSignal(null)

    try {
      const response = await fetch('/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticker: tickerInput,
          timeframe,
          risk
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate signal')
      }

      const data = await response.json()
      setSignal(data)
    } catch (err) {
      setError(err.message)
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handlePlaceTrade = async () => {
    if (!signal || signal.signal !== 'BUY') return

    setTradeLoading(true)
    setToast(null)

    try {
      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticker: tickerInput,
          qty: 1,
          side: 'buy'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place trade')
      }

      const data = await response.json()
      setToast(data.message)
      console.log('Trade placed:', data)

      // Record the trade in Supabase so the portfolio stays per-user
      const entryPrice = parseFloat(String(signal.entry).replace(/[^0-9.]/g, ''))
      if (entryPrice > 0) {
        await recordTrade({ symbol: tickerInput, side: 'buy', quantity: 1, price: entryPrice })
      }

      // Trigger portfolio refresh
      if (onTradeSuccess) {
        onTradeSuccess()
      }
    } catch (err) {
      setToast(err.message)
      console.error('Trade error:', err)
    } finally {
      setTradeLoading(false)
    }
  }

  const signalColors = {
    BUY: { bg: 'bg-emerald-500 bg-opacity-20', border: 'border-emerald-500 border-opacity-40', text: 'text-emerald-400', badge: 'bg-emerald-500' },
    SELL: { bg: 'bg-red-500 bg-opacity-20', border: 'border-red-500 border-opacity-40', text: 'text-red-400', badge: 'bg-red-500' },
    HOLD: { bg: 'bg-yellow-500 bg-opacity-20', border: 'border-yellow-500 border-opacity-40', text: 'text-yellow-400', badge: 'bg-yellow-500' }
  }

  const signalColor = signal ? signalColors[signal.signal] : null
  
  return (
    <div className="space-y-6">
      {/* Stock Picker */}
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-base">Stock Picker</h3>
        <input
          type="text"
          value={tickerInput}
          onChange={(e) => setTickerInput(e.target.value)}
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 border-opacity-40 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}
      
      {/* Loading Spinner */}
      {loading && <Spinner />}
      
      {/* Signal Card */}
      {signal && !loading && (
        <div className={`rounded-2xl p-6 border-2 ${signalColor.bg} ${signalColor.border}`}>
          <div className="space-y-4">
            {/* Signal type badge */}
            <div className="flex justify-center">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${signalColor.badge} text-white`}>
                {signal.signal} Signal
              </span>
            </div>
            
            {/* Ticker and Timeframe */}
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{tickerInput}</div>
              <div className="text-xs text-gray-400">{timeframe} timeframe</div>
            </div>

            {/* Reasoning */}
            <div className="bg-[#0f0f0f] rounded-lg p-4 border border-[#2a2a2a]">
              <p className="text-gray-300 text-sm">{signal.reasoning}</p>
            </div>

            {/* Conviction Bar */}
            <div>
              <label className="text-white text-xs font-semibold mb-2 block">Conviction</label>
              <ProgressBar value={signal.conviction} color="bg-blue-500" />
            </div>

            {/* Risk Bar */}
            <div>
              <label className="text-white text-xs font-semibold mb-2 block">Risk</label>
              <ProgressBar value={signal.risk} color={signal.risk > 70 ? 'bg-red-500' : signal.risk > 40 ? 'bg-yellow-500' : 'bg-emerald-500'} />
            </div>

            {/* Entry, Target, Stop Loss */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Entry</div>
                <div className="text-white font-semibold">{signal.entry}</div>
              </div>
              <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Target</div>
                <div className="text-emerald-400 font-semibold">{signal.target}</div>
              </div>
              <div className="bg-[#0f0f0f] rounded-lg p-3 border border-[#2a2a2a] text-center">
                <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
                <div className="text-red-400 font-semibold">{signal.stopLoss}</div>
              </div>
            </div>

            {/* Action Button */}
            {signal.signal === 'BUY' ? (
              <button
                onClick={handlePlaceTrade}
                disabled={tradeLoading}
                className={`w-full ${signalColor.badge} hover:opacity-90 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition`}
              >
                {tradeLoading ? 'Placing Order...' : 'Buy with Alpaca'}
              </button>
            ) : (
              <button className={`w-full ${signalColor.badge} hover:opacity-90 text-white font-semibold py-2.5 rounded-lg transition opacity-50 cursor-not-allowed`}>
                {signal.signal === 'SELL' ? 'Sell Signal' : 'Hold Signal'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in">
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold">
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

