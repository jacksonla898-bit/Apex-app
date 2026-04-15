import { useState, useEffect } from 'react'
import './App.css'
import { supabase } from './supabaseClient'
import Login from './Login'
import Profile from './Profile'

// Toast notification component
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in fade-in">
      <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold">
        ✓ {message}
      </div>
    </div>
  )
}

// Modal component for Copy Trade
const CopyTradeModal = ({ modalData, onConfirm, onCancel, onQuantityChange }) => {
  const { post, quantity, loading } = modalData

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-end">
      <div className="w-full max-w-2xl mx-auto bg-[#1a1a1a] rounded-t-2xl p-6 border-t border-[#2a2a2a]">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Copy This Trade?</h3>
          <button onClick={(e) => { e.preventDefault(); onCancel(); }} type="button" className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-[#0f0f0f] rounded-lg p-4 space-y-3">
            <div className="space-y-1">
              <p className="text-gray-400 text-sm">Trader</p>
              <p className="text-white font-semibold">{post.username}</p>
            </div>
            <div className="border-t border-[#2a2a2a] pt-3 space-y-1">
              <p className="text-gray-400 text-sm">Signal</p>
              <p className={`font-semibold ${post.signal === 'BUY' ? 'text-emerald-400' : 'text-red-400'}`}>
                {post.signal} {post.ticker}
              </p>
            </div>
            <div className="border-t border-[#2a2a2a] pt-3">
              <p className="text-gray-400 text-sm mb-1">Strategy</p>
              <p className="text-gray-300 text-sm">{post.content}</p>
            </div>
          </div>

          <div className="bg-[#0f0f0f] rounded-lg p-4">
            <label className="block text-gray-400 text-sm mb-2">Quantity (Shares)</label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => onQuantityChange(parseInt(e.target.value) || 1)}
              className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            type="button"
            className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={(e) => { e.preventDefault(); onConfirm(e); }}
            disabled={loading}
            type="button"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Placing Trade...
              </>
            ) : (
              'Confirm Copy'
            )}
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
const PortfolioScreen = ({ onLogout, refreshTrigger }) => {
  const [portfolio, setPortfolio] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPortfolio()
  }, [refreshTrigger])

  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/portfolio')
      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio: ${response.status}`)
      }

      const data = await response.json()
      setPortfolio(data)
    } catch (err) {
      console.error('Error fetching portfolio:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold"
          >
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
          <button
            onClick={onLogout}
            className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold"
          >
            Logout
          </button>
        </div>
        <div className="bg-red-500 bg-opacity-10 border border-red-500 border-opacity-30 rounded-2xl p-6">
          <p className="text-red-400 font-semibold mb-2">Portfolio Error</p>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={fetchPortfolio}
            className="mt-4 bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const account = portfolio?.account
  const positions = portfolio?.positions || []

  return (
    <div className="space-y-6">
      {/* Logout Button */}
      <div className="flex justify-between items-center">
        <button
          onClick={fetchPortfolio}
          className="bg-gray-600 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition font-semibold"
        >
          🔄 Refresh
        </button>
        <button
          onClick={onLogout}
          className="bg-red-500 hover:bg-red-600 text-white text-sm px-4 py-2 rounded-lg transition font-semibold"
        >
          Logout
        </button>
      </div>

      {/* Account Overview */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a]">
        <p className="text-gray-400 text-sm mb-2">Total Portfolio Value</p>
        <div className="text-5xl font-bold text-white mb-2">
          ${account?.equity?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-gray-400 text-xs">Cash Balance</p>
            <p className="text-white font-semibold">
              ${account?.cash?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Buying Power</p>
            <p className="text-emerald-400 font-semibold">
              ${account?.buyingPower?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
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
          <div className="space-y-1">
            {positions.map((position) => (
              <div key={position.symbol} className="bg-[#1a1a1a] rounded-xl p-4 border border-[#2a2a2a] flex items-center justify-between hover:bg-[#222] transition">
                <div className="flex-1">
                  <div className="font-bold text-white text-base">{position.symbol}</div>
                  <div className="text-gray-500 text-xs">{position.qty} shares @ ${position.avgEntryPrice?.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">${position.currentPrice?.toFixed(2)}</div>
                  <div className="text-gray-400 text-xs">Market Value: ${position.marketValue?.toFixed(2)}</div>
                  <div className={`text-sm font-semibold ${position.unrealizedPl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {position.unrealizedPl >= 0 ? '+' : ''}${position.unrealizedPl?.toFixed(2)} ({position.unrealizedPlpc >= 0 ? '+' : ''}{(position.unrealizedPlpc * 100)?.toFixed(2)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// Feed Screen
const FeedScreen = ({ onUserClick }) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [postTradeModal, setPostTradeModal] = useState(false)
  const [copyTradeModal, setCopyTradeModal] = useState(null)
  const [user, setUser] = useState(null)
  const [userLikes, setUserLikes] = useState({})
  const [replies, setReplies] = useState({})
  const [expandedReplies, setExpandedReplies] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  useEffect(() => {
    fetchPosts()
    
    const subscription = supabase
      .channel('posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        fetchPosts()
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) return
    
    const likesSubscription = supabase
      .channel('likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
        fetchPosts()
        fetchUserLikes()
      })
      .subscribe()

    const repliesSubscription = supabase
      .channel('replies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, (payload) => {
        fetchReplies()
      })
      .subscribe()

    return () => {
      likesSubscription.unsubscribe()
      repliesSubscription.unsubscribe()
    }
  }, [user])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      // Transform the data to include username from profile if needed, with fallback to email prefix
      const transformedPosts = data?.map(post => ({
        ...post,
        username: post.username || 'Unknown'
      })) || []
      
      setPosts(transformedPosts)
      if (user) fetchUserLikes()
    } catch (err) {
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserLikes = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
      
      if (error) throw error
      const likes = {}
      data?.forEach(like => {
        likes[like.post_id] = true
      })
      setUserLikes(likes)
    } catch (err) {
      console.error('Error fetching user likes:', err)
    }
  }

  const fetchReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('replies')
        .select(`
          *,
          profiles:user_id (
            username
          )
        `)
        .order('created_at', { ascending: true })
      
      if (error) throw error
      
      // Transform the data to include username from profile, with fallback to email prefix
      const transformedReplies = data?.map(reply => ({
        ...reply,
        username: reply.profiles?.username || (reply.username?.split('@')[0] || 'Unknown')
      })) || []
      
      const repliesByPost = {}
      transformedReplies.forEach(reply => {
        if (!repliesByPost[reply.post_id]) repliesByPost[reply.post_id] = []
        repliesByPost[reply.post_id].push(reply)
      })
      setReplies(repliesByPost)
    } catch (err) {
      console.error('Error fetching replies:', err)
    }
  }

  const handlePostTrade = async (postData) => {
    try {
      if (!user) {
        setToast('Please log in to post')
        return
      }

      // Get username from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      let username = user.email?.split('@')[0] || 'Unknown' // fallback to email prefix
      if (!profileError && profile?.username) {
        username = profile.username
      }

      const { error } = await supabase.from('posts').insert([
        {
          user_id: user.id,
          username: username,
          ticker: postData.ticker,
          signal: postData.signal,
          content: postData.content,
          created_at: new Date().toISOString(),
          likes: 0
        }
      ])

      if (error) throw error
      setToast('Trade posted successfully!')
      setPostTradeModal(false)
      fetchPosts()
    } catch (err) {
      console.error('Error posting trade:', err)
      setToast('Failed to post trade')
    }
  }

  const handleLike = async (postId) => {
    if (!user) {
      setToast('Please log in to like')
      return
    }

    try {
      const isLiked = userLikes[postId]
      
      if (isLiked) {
        // Unlike
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
        
        if (error) throw error
        
        const newLikes = { ...userLikes }
        delete newLikes[postId]
        setUserLikes(newLikes)
      } else {
        // Like
        const { error } = await supabase
          .from('likes')
          .insert([{ post_id: postId, user_id: user.id }])
        
        if (error) throw error
        setUserLikes({ ...userLikes, [postId]: true })
      }
    } catch (err) {
      console.error('Error toggling like:', err)
    }
  }

  const handleCopyTrade = (post) => {
    setCopyTradeModal({ post, quantity: 1, loading: false })
  }

  const handleConfirmCopyTrade = async (e) => {
    if (e) e.preventDefault()
    if (!copyTradeModal) return

    setCopyTradeModal(prev => ({ ...prev, loading: true }))

    try {
      const { post, quantity } = copyTradeModal
      const side = post.signal === 'BUY' ? 'buy' : 'sell'

      const response = await fetch('/api/trade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ticker: post.ticker,
          side: side,
          qty: quantity
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place trade')
      }

      const data = await response.json()
      setToast(`✅ ${data.message}`)
      setCopyTradeModal(null)

      // Trigger portfolio refresh
      setPortfolioRefreshTrigger(prev => prev + 1)
    } catch (err) {
      setToast(`❌ ${err.message}`)
      setCopyTradeModal(prev => ({ ...prev, loading: false }))
    }
  }

  const formatTimeAgo = (timestamp) => {
    const now = new Date()
    const postTime = new Date(timestamp)
    const diffMs = now - postTime
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'BUY':
        return { bg: 'bg-emerald-500 bg-opacity-20', border: 'border-emerald-500', text: 'text-emerald-400', badge: 'bg-emerald-500' }
      case 'SELL':
        return { bg: 'bg-red-500 bg-opacity-20', border: 'border-red-500', text: 'text-red-400', badge: 'bg-red-500' }
      case 'HOLD':
        return { bg: 'bg-yellow-500 bg-opacity-20', border: 'border-yellow-500', text: 'text-yellow-400', badge: 'bg-yellow-500' }
      default:
        return { bg: 'bg-gray-500 bg-opacity-20', border: 'border-gray-500', text: 'text-gray-400', badge: 'bg-gray-500' }
    }
  }

  return (
    <div className="space-y-4">
      {/* Post Trade Button */}
      <button
        onClick={() => setPostTradeModal(true)}
        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition"
      >
        Post Trade
      </button>

      {/* Posts */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading trades...</div>
      ) : posts.length === 0 ? (
        <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a2a2a] text-center">
          <div className="text-gray-400 mb-2">No trades posted yet.</div>
          <div className="text-gray-500 text-sm">Be the first to share a signal!</div>
        </div>
      ) : (
        posts.map((post) => {
          const signalColor = getSignalColor(post.signal)
          const isLiked = userLikes[post.id]
          const postReplies = replies[post.id] || []
          const repliesCount = postReplies.length
          const isExpanded = expandedReplies[post.id]
          
          return (
            <div key={post.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a] space-y-3">
              {/* Header with username and time */}
              <div className="flex items-center justify-between">
                <div>
                  <button
                    onClick={() => onUserClick(post.user_id)}
                    className="font-semibold text-white text-sm hover:text-emerald-400 transition"
                  >
                    {post.username}
                  </button>
                  <div className="text-gray-500 text-xs">{formatTimeAgo(post.created_at)}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${signalColor.bg} ${signalColor.text} border-opacity-30`}>
                  {post.signal}
                </span>
              </div>

              {/* Post content */}
              <p className="text-gray-200 text-sm">{post.content}</p>

              {/* Ticker tag */}
              <div className="flex gap-2 flex-wrap">
                <span className="bg-blue-500 bg-opacity-20 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-500 border-opacity-30 font-medium">
                  ${post.ticker}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex-1 text-sm py-2 rounded-lg transition border ${
                    isLiked
                      ? 'bg-emerald-500 bg-opacity-20 border-emerald-500 border-opacity-30 text-emerald-400 font-semibold'
                      : 'bg-[#0f0f0f] hover:bg-[#1a1a1a] text-gray-300 border-[#2a2a2a]'
                  }`}
                >
                  👍 {post.likes || 0}
                </button>
                <button
                  onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                  className="flex-1 bg-[#0f0f0f] hover:bg-[#1a1a1a] text-gray-300 text-sm py-2 rounded-lg transition border border-[#2a2a2a]"
                >
                  💬 {repliesCount}
                </button>
                <button
                  onClick={() => handleCopyTrade(post)}
                  type="button"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg transition text-sm"
                >
                  Copy Trade
                </button>
              </div>

              {/* Reply Input */}
              {replyingTo === post.id && (
                <div className="space-y-2 pt-2 border-t border-[#2a2a2a]">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg text-sm hover:border-[#3a3a3a] transition"
                      onKeyPress={(e) => e.key === 'Enter' && handleReply(post.id)}
                    />
                    <button
                      onClick={() => handleReply(post.id)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-lg transition text-sm font-semibold"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}

              {/* Replies */}
              {repliesCount > 0 && (
                <div className="pt-2 border-t border-[#2a2a2a] space-y-2">
                  {!isExpanded && (
                    <button
                      onClick={() => setExpandedReplies({ ...expandedReplies, [post.id]: true })}
                      className="text-emerald-400 text-xs font-semibold hover:text-emerald-300 transition"
                    >
                      View {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
                    </button>
                  )}
                  
                  {isExpanded && (
                    <>
                      {postReplies.map((reply) => (
                        <div key={reply.id} className="bg-[#0f0f0f] rounded-lg p-3 border border-[#2a2a2a] space-y-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-semibold text-white text-xs">{reply.username}</div>
                              <div className="text-gray-500 text-xs">{formatTimeAgo(reply.created_at)}</div>
                            </div>
                          </div>
                          <p className="text-gray-300 text-sm">{reply.content}</p>
                        </div>
                      ))}
                      <button
                        onClick={() => setExpandedReplies({ ...expandedReplies, [post.id]: false })}
                        className="text-gray-500 text-xs hover:text-gray-400 transition"
                      >
                        Hide replies
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Post Trade Modal */}
      {postTradeModal && (
        <PostTradeModal
          onPost={handlePostTrade}
          onCancel={() => setPostTradeModal(false)}
        />
      )}

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {copyTradeModal && (
        <CopyTradeModal
          modalData={copyTradeModal}
          onConfirm={handleConfirmCopyTrade}
          onCancel={() => setCopyTradeModal(null)}
          onQuantityChange={(quantity) => setCopyTradeModal(prev => ({ ...prev, quantity }))}
        />
      )}
    </div>
  )
}



// Post Trade Modal Component
const PostTradeModal = ({ onPost, onCancel }) => {
  const [ticker, setTicker] = useState('')
  const [signal, setSignal] = useState('BUY')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!ticker || !content) {
      alert('Please fill in all fields')
      return
    }
    setLoading(true)
    await onPost({ ticker: ticker.toUpperCase(), signal, content })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-2xl border border-[#2a2a2a] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-bold text-lg">Post Trade</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-white text-xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Ticker Input */}
          <div>
            <label className="text-white text-sm font-semibold block mb-2">Ticker</label>
            <input
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="e.g., NVDA, AAPL, SPY"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition"
            />
          </div>

          {/* Signal Dropdown */}
          <div>
            <label className="text-white text-sm font-semibold block mb-2">Signal</label>
            <select
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition appearance-none cursor-pointer"
            >
              <option value="BUY">BUY</option>
              <option value="SELL">SELL</option>
              <option value="HOLD">HOLD</option>
            </select>
          </div>

          {/* Content Textarea */}
          <div>
            <label className="text-white text-sm font-semibold block mb-2">Your Reasoning</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your analysis and trading reasoning..."
              rows="4"
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white px-4 py-2.5 rounded-lg hover:border-[#3a3a3a] transition resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-[#1a1a1a] hover:bg-[#2a2a2a] text-white font-semibold py-2.5 rounded-lg transition border border-[#2a2a2a]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading ? 'Posting...' : 'Post Trade'}
            </button>
          </div>
        </form>
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
          symbol: tickerInput,
          qty: 1,
          side: 'buy'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to place trade')
      }

      const data = await response.json()
      setToast(`✅ ${data.message}`)
      console.log('Trade placed:', data)
      
      // Trigger portfolio refresh
      if (onTradeSuccess) {
        onTradeSuccess()
      }
    } catch (err) {
      setToast(`❌ ${err.message}`)
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
  const [viewingProfileId, setViewingProfileId] = useState(null)
  const [portfolioRefreshTrigger, setPortfolioRefreshTrigger] = useState(0)

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
        return <FeedScreen onUserClick={handleUserClick} />
      case 'ai':
        return <AITraderScreen onTradeSuccess={() => setPortfolioRefreshTrigger(prev => prev + 1)} />
      case 'funds':
        return <FundsScreen />
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
        <div className="border-t border-[#2a2a2a] bg-[#0f0f0f] px-4 py-4 grid grid-cols-5 gap-2 sticky bottom-0">
          {[
            { id: 'portfolio', label: 'Portfolio', icon: '📊' },
            { id: 'feed', label: 'Feed', icon: '📱' },
            { id: 'ai', label: 'AI Trader', icon: '🤖' },
            { id: 'funds', label: 'Funds', icon: '💰' },
            { id: 'profile', label: 'Profile', icon: '👤' }
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
              <div className="text-xl mb-1">{tab.icon}</div>
              <div className="text-xs font-semibold">{tab.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

