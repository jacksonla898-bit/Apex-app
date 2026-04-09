import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import Login from './Login'

// Toast notification component
const Toast = ({ message, onClose }) => {
  useState(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in">
      <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold">
        ✓ {message}
      </div>
    </div>
  )
}

// Modal component for Copy Trade
const CopyTradeModal = ({ trader, post, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end">
      <div className="w-full max-w-2xl mx-auto bg-[#1a1a1a] rounded-t-2xl p-6 border-t border-[#2a2a2a]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Copy This Trade?</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-[#0f0f0f] rounded-lg p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-gray-400 text-sm">Trader</p>
              <p className="text-white font-semibold">{trader}</p>
            </div>
            <div className="border-t border-[#2a2a2a] pt-3 space-y-1">
              <p className="text-gray-400 text-sm">Trading</p>
              <p className="text-white font-semibold">{post.tags[0]}</p>
            </div>
            <div className="border-t border-[#2a2a2a] pt-3">
              <p className="text-gray-400 text-sm mb-1">Strategy</p>
              <p className="text-gray-300 text-sm">{post.text}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold py-3 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition"
          >
            Confirm Copy
          </button>
        </div>
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
const PortfolioScreen = ({ onLogout }) => {
  const holdings = [
    { ticker: 'AAPL', price: 182.45, change: 5.2, shares: 12 },
    { ticker: 'NVDA', price: 892.30, change: 12.8, shares: 5 },
    { ticker: 'TSLA', price: 245.67, change: -2.1, shares: 8 }
  ]
  
  return (
    <div className="space-y-6">
      {/* Logout Button */}
      <div className="flex justify-end">
        <button
          onClick={onLogout}
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold"
        >
          Logout
        </button>
      </div>
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
        <p className="text-gray-400 text-sm mb-2">Total Portfolio Value</p>
        <div className="text-5xl font-bold text-white mb-2">$47,823</div>
        <div className="flex items-center gap-2">
          <span className="text-emerald-400 text-lg font-semibold">+$3,422</span>
          <span className="text-emerald-400 text-lg">(7.7%)</span>
          <span className="text-emerald-400">📈</span>
        </div>
        <div className="mt-6 h-20">
          <LineChart />
        </div>
      </div>
      
      {/* Holdings */}
      <div>
        <h3 className="text-white font-semibold text-lg mb-4">Your Holdings</h3>
        <div className="space-y-1">
          {holdings.map((holding) => (
            <div key={holding.ticker} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] flex items-center justify-between hover:bg-[#222] transition">
              <div className="flex-1">
                <div className="font-bold text-white text-base">{holding.ticker}</div>
                <div className="text-gray-500 text-xs">{holding.shares} shares</div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold">${holding.price.toFixed(2)}</div>
                <div className={`text-sm font-semibold ${holding.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {holding.change >= 0 ? '+' : ''}{holding.change.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Feed Screen
const FeedScreen = () => {
  const [copyTradeModal, setCopyTradeModal] = useState(null)
  const [toast, setToast] = useState(null)

  const posts = [
    {
      id: 1,
      name: 'Sarah Chen',
      username: '@sarahchen',
      returnPercentage: 24.5,
      text: 'Just caught a breakout on NVDA. Strong momentum building 🚀',
      tags: ['NVDA', 'Tech'],
      bgColor: 'bg-purple-500'
    },
    {
      id: 2,
      name: 'Alex Rodriguez',
      username: '@alexrodriguez',
      returnPercentage: 18.3,
      text: 'Healthcare sector looking bullish. Adding to GOOGL position',
      tags: ['GOOGL', 'Healthcare'],
      bgColor: 'bg-blue-500'
    },
    {
      id: 3,
      name: 'Jordan Park',
      username: '@jordanpark',
      returnPercentage: 31.7,
      text: 'TSLA consolidation phase complete. Expecting move up ⚡',
      tags: ['TSLA', 'EV'],
      bgColor: 'bg-pink-500'
    }
  ]

  const handleCopyTrade = (post) => {
    setCopyTradeModal({ trader: post.name, post })
  }

  const handleConfirmCopy = () => {
    setToast('Trade copied successfully!')
    setCopyTradeModal(null)
  }
  
  return (
    <div className="space-y-3">
      {posts.map((post) => (
        <div key={post.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a] space-y-3">
          {/* Header with avatar and return badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={post.name} bgColor={post.bgColor} />
              <div>
                <div className="font-semibold text-white text-sm">{post.name}</div>
                <div className="text-gray-500 text-xs">{post.username}</div>
              </div>
            </div>
            <div className="bg-emerald-500 bg-opacity-20 px-3 py-1 rounded-full border border-emerald-500 border-opacity-30">
              <span className="text-emerald-400 text-xs font-bold">+{post.returnPercentage}%</span>
            </div>
          </div>
          
          {/* Post text */}
          <p className="text-gray-200 text-sm">{post.text}</p>
          
          {/* Stock tags */}
          <div className="flex gap-2 flex-wrap">
            {post.tags.map((tag) => (
              <span key={tag} className="bg-blue-500 bg-opacity-20 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-500 border-opacity-30 font-medium">
                ${tag}
              </span>
            ))}
          </div>
          
          {/* Copy Trade button */}
          <button
            onClick={() => handleCopyTrade(post)}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition text-sm"
          >
            Copy Trade
          </button>
        </div>
      ))}

      {copyTradeModal && (
        <CopyTradeModal
          trader={copyTradeModal.trader}
          post={copyTradeModal.post}
          onConfirm={handleConfirmCopy}
          onCancel={() => setCopyTradeModal(null)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}

// AI Trader Screen
const AITraderScreen = () => {
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const [timeframe, setTimeframe] = useState('1h')
  const [risk, setRisk] = useState(50)
  const [signal, setSignal] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const tickers = ['AAPL', 'NVDA', 'TSLA', 'AMD', 'GOOGL', 'MSFT']
  
  const handleRunSignal = async () => {
    setLoading(true)
    setError(null)
    setSignal(null)
    
    try {
      const response = await fetch('http://localhost:3001/api/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticker: selectedTicker,
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
        <div className="grid grid-cols-3 gap-2">
          {tickers.map((ticker) => (
            <button
              key={ticker}
              onClick={() => setSelectedTicker(ticker)}
              className={`py-2 px-3 rounded-full font-semibold text-sm transition ${
                selectedTicker === ticker
                  ? 'bg-emerald-500 text-white'
                  : 'bg-[#1a1a1a] text-gray-300 border border-[#2a2a2a] hover:border-[#3a3a3a]'
              }`}
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
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition"
      >
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
              <div className="text-3xl font-bold text-white">{selectedTicker}</div>
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
            <button className={`w-full ${signalColor.badge} hover:opacity-90 text-white font-semibold py-2.5 rounded-lg transition`}>
              {signal.signal === 'SELL' ? 'Sell Now' : 'Buy Now'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Funds Screen
const FundsScreen = () => {
  const funds = [
    {
      id: 1,
      name: 'Apex Growth Fund',
      manager: 'Sarah Chen',
      return: 42.8,
      aum: '$485M',
      minInvest: '$1,000'
    },
    {
      id: 2,
      name: 'Tech Innovation Fund',
      manager: 'Marcus Johnson',
      return: 38.5,
      aum: '$762M',
      minInvest: '$5,000'
    }
  ]
  
  return (
    <div className="space-y-4">
      {funds.map((fund) => (
        <div key={fund.id} className="bg-gradient-to-br from-[#1a1a1a] to-[#141414] rounded-2xl p-5 border border-[#2a2a2a] space-y-4">
          <div className="space-y-2">
            <div className="font-bold text-white text-base">{fund.name}</div>
            <div className="text-gray-400 text-sm">Manager: {fund.manager}</div>
          </div>
          
          <div className="flex justify-between items-start pt-2 border-t border-[#2a2a2a]">
            <div className="space-y-3 flex-1">
              <div>
                <div className="text-gray-500 text-xs mb-1">Assets Under Management</div>
                <div className="text-white font-semibold">{fund.aum}</div>
              </div>
              <div>
                <div className="text-gray-500 text-xs mb-1">Minimum Investment</div>
                <div className="text-white font-semibold">{fund.minInvest}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-emerald-400 text-3xl font-bold">{fund.return}%</div>
              <div className="text-gray-500 text-xs">YTD Return</div>
            </div>
          </div>
          
          <button className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition text-sm">
            Invest Now
          </button>
        </div>
      ))}
    </div>
  )
}

// Main App Component
export default function App() {
  const [activeTab, setActiveTab] = useState('portfolio')
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
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

  const renderScreen = () => {
    switch (activeTab) {
      case 'portfolio':
        return <PortfolioScreen onLogout={handleLogout} />
      case 'feed':
        return <FeedScreen />
      case 'ai':
        return <AITraderScreen />
      case 'funds':
        return <FundsScreen />
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
    return <Login onAuthSuccess={handleAuthSuccess} />
  }
  
  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* Main Content - Centered on Desktop */}
      <div className="mx-auto max-w-2xl h-screen flex flex-col border-x border-[#2a2a2a]">
        {/* Header */}
        <div className="bg-[#0f0f0f] border-b border-[#2a2a2a] p-4 sticky top-0 z-10">
          <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-300">
            APEX
          </div>
          <p className="text-gray-500 text-xs mt-1">Trading • Investing • Wealth</p>
        </div>
        
        {/* Screen Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {renderScreen()}
        </div>
        
        {/* Bottom Navigation */}
        <div className="border-t border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4 grid grid-cols-4 gap-2 sticky bottom-0">
          {[
            { id: 'portfolio', label: 'Portfolio', icon: '📊' },
            { id: 'feed', label: 'Feed', icon: '📱' },
            { id: 'ai', label: 'AI Trader', icon: '🤖' },
            { id: 'funds', label: 'Funds', icon: '💰' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-2 px-2 rounded-lg transition ${
                activeTab === tab.id
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <div className="text-xl mb-1">{tab.icon}</div>
              <div className="text-xs font-semibold">{tab.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
