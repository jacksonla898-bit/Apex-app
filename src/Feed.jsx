import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Heart, MessageCircle, PlusCircle, Check, X, Send } from 'lucide-react'

// Toast notification component
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-emerald-500 text-white px-6 py-3 rounded-lg shadow-lg font-semibold flex items-center gap-2">
        <Check className="w-4 h-4" />
        {message}
      </div>
    </div>
  )
}

// Post Trade Modal
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
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f0f0f] rounded-2xl border border-[#2a2a2a] p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-bold text-lg">Post Trade</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
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

// Feed Screen
const FeedScreen = ({ onUserClick, setPortfolioRefreshTrigger }) => {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [postTradeModal, setPostTradeModal] = useState(false)
  const [copyModal, setCopyModal] = useState(null)
  const [copyLoading, setCopyLoading] = useState(false)
  const [copyQty, setCopyQty] = useState(1)
  const [toast, setToast] = useState(null)
  const [user, setUser] = useState(null)

  // likeCounts: { [postId]: number } — derived from the likes table (source of truth)
  const [likeCounts, setLikeCounts] = useState({})
  // userLikes: { [postId]: true } — which posts the current user has liked
  const [userLikes, setUserLikes] = useState({})
  // replies: { [postId]: Reply[] }
  const [replies, setReplies] = useState({})
  // openReplies: Set of post IDs whose reply section is expanded
  const [openReplies, setOpenReplies] = useState(new Set())
  // replyInput: { [postId]: string } — per-post draft text
  const [replyInput, setReplyInput] = useState({})

  // Resolve current user once on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
  }, [])

  // Fetch user's own likes whenever user is resolved
  useEffect(() => {
    if (user) fetchUserLikes()
  }, [user])

  // Initial data load + realtime subscriptions (all on mount, not gated on user)
  useEffect(() => {
    fetchPosts()
    fetchLikeCounts()
    fetchReplies()

    const postsSub = supabase
      .channel('feed-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe()

    // Realtime: rebuild like counts from likes table on any change
    const likesSub = supabase
      .channel('feed-likes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, () => {
        fetchLikeCounts()
        fetchUserLikes()
      })
      .subscribe()

    const repliesSub = supabase
      .channel('feed-replies')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'replies' }, fetchReplies)
      .subscribe()

    return () => {
      postsSub.unsubscribe()
      likesSub.unsubscribe()
      repliesSub.unsubscribe()
    }
  }, [])

  const fetchPosts = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      setPosts(data?.map(p => ({ ...p, username: p.username || 'Unknown' })) || [])
    } catch (err) {
      console.error('Error fetching posts:', err)
    } finally {
      setLoading(false)
    }
  }

  // Counts are always derived from the likes table — never trust posts.likes
  const fetchLikeCounts = async () => {
    try {
      const { data, error } = await supabase.from('likes').select('post_id')
      if (error) throw error
      const counts = {}
      data?.forEach(like => {
        counts[like.post_id] = (counts[like.post_id] || 0) + 1
      })
      setLikeCounts(counts)
    } catch (err) {
      console.error('Error fetching like counts:', err)
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
      const map = {}
      data?.forEach(like => { map[like.post_id] = true })
      setUserLikes(map)
    } catch (err) {
      console.error('Error fetching user likes:', err)
    }
  }

  const fetchReplies = async () => {
    try {
      const { data, error } = await supabase
        .from('replies')
        .select('*, profiles:user_id(username)')
        .order('created_at', { ascending: true })
      if (error) throw error
      const grouped = {}
      data?.forEach(reply => {
        const username = reply.profiles?.username || reply.username?.split('@')[0] || 'Unknown'
        if (!grouped[reply.post_id]) grouped[reply.post_id] = []
        grouped[reply.post_id].push({ ...reply, username })
      })
      setReplies(grouped)
    } catch (err) {
      console.error('Error fetching replies:', err)
    }
  }

  const handlePostTrade = async (postData) => {
    if (!user) { setToast('Please log in to post'); return }
    try {
      const { data: profile } = await supabase
        .from('profiles').select('username').eq('id', user.id).single()
      const username = profile?.username || user.email?.split('@')[0] || 'Unknown'
      const { error } = await supabase.from('posts').insert([{
        user_id: user.id,
        username,
        ticker: postData.ticker,
        signal: postData.signal,
        content: postData.content,
        created_at: new Date().toISOString(),
        likes: 0
      }])
      if (error) throw error
      setToast('Trade posted!')
      setPostTradeModal(false)
      fetchPosts()
    } catch (err) {
      console.error('Error posting trade:', err)
      setToast('Failed to post trade')
    }
  }

  const handleLike = async (postId) => {
    if (!user) { setToast('Please log in to like'); return }
    const isLiked = !!userLikes[postId]

    // Optimistic update — feels instant
    setUserLikes(prev => {
      const next = { ...prev }
      if (isLiked) delete next[postId]
      else next[postId] = true
      return next
    })
    setLikeCounts(prev => ({
      ...prev,
      [postId]: Math.max(0, (prev[postId] || 0) + (isLiked ? -1 : 1))
    }))

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('likes').insert([{ post_id: postId, user_id: user.id }])
        if (error) throw error
      }
    } catch (err) {
      console.error('Error toggling like:', err)
      // Roll back on failure
      fetchLikeCounts()
      fetchUserLikes()
    }
  }

  const toggleReplies = (postId) => {
    setOpenReplies(prev => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  const handleReply = async (postId) => {
    const content = (replyInput[postId] || '').trim()
    if (!content) return
    if (!user) { setToast('Please log in to reply'); return }

    // Optimistic: show reply immediately
    const tempId = `temp-${Date.now()}`
    const tempReply = {
      id: tempId,
      post_id: postId,
      user_id: user.id,
      username: user.email?.split('@')[0] || 'You',
      content,
      created_at: new Date().toISOString()
    }
    setReplies(prev => ({ ...prev, [postId]: [...(prev[postId] || []), tempReply] }))
    setReplyInput(prev => ({ ...prev, [postId]: '' }))

    try {
      const { error } = await supabase.from('replies').insert([{
        post_id: postId,
        user_id: user.id,
        content,
        created_at: new Date().toISOString()
      }])
      if (error) throw error
      // Realtime subscription will replace the temp reply with the real one
    } catch (err) {
      console.error('Error posting reply:', err)
      // Roll back temp reply
      setReplies(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(r => r.id !== tempId)
      }))
      setToast('Failed to post reply')
    }
  }

  const formatTimeAgo = (timestamp) => {
    const diffMins = Math.floor((Date.now() - new Date(timestamp)) / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'BUY':  return { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' }
      case 'SELL': return { bg: 'bg-red-500/10',     border: 'border-red-500/30',     text: 'text-red-400' }
      case 'HOLD': return { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/30',  text: 'text-yellow-400' }
      default:     return { bg: 'bg-gray-500/10',    border: 'border-gray-500/30',    text: 'text-gray-400' }
    }
  }

  return (
    <div className="space-y-4">
      {/* Post Trade Button */}
      <button
        onClick={() => setPostTradeModal(true)}
        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
      >
        <PlusCircle className="w-5 h-5" /> Post Trade
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
          const isLiked = !!userLikes[post.id]
          const likeCount = likeCounts[post.id] || 0
          const postReplies = replies[post.id] || []
          const replyCount = postReplies.length
          const isReplyOpen = openReplies.has(post.id)

          return (
            <div key={post.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a] space-y-3">
              {/* Header */}
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
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${signalColor.bg} ${signalColor.text} ${signalColor.border}`}>
                  {post.signal}
                </span>
              </div>

              {/* Content */}
              <p className="text-gray-200 text-sm leading-relaxed">{post.content}</p>

              {/* Ticker tag */}
              <div>
                <span className="bg-blue-500/10 text-blue-300 text-xs px-2.5 py-1 rounded-full border border-blue-500/20 font-medium">
                  ${post.ticker}
                </span>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-2 pt-1">
                {/* Like */}
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    isLiked
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#0f0f0f] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-emerald-400' : ''}`} />
                  <span>{likeCount}</span>
                </button>

                {/* Reply */}
                <button
                  onClick={() => toggleReplies(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    isReplyOpen
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#0f0f0f] border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#3a3a3a]'
                  }`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{replyCount}</span>
                </button>

                {/* Copy Trade — pushed right */}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCopyModal(post); setCopyQty(1) }}
                  className="ml-auto px-3 py-1.5 bg-[#0f0f0f] hover:bg-[#2a2a2a] border border-[#2a2a2a] hover:border-emerald-500/40 text-emerald-400 text-xs font-semibold rounded-lg transition"
                >
                  Copy Trade
                </button>
              </div>

              {/* Reply section */}
              {isReplyOpen && (
                <div className="pt-3 border-t border-[#2a2a2a] space-y-3">
                  {/* Existing replies */}
                  {postReplies.length > 0 && (
                    <div className="space-y-2">
                      {postReplies.map((reply) => (
                        <div key={reply.id} className="bg-[#0f0f0f] rounded-xl p-3 border border-[#2a2a2a]">
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-white text-xs font-semibold">{reply.username}</span>
                            <span className="text-gray-600 text-xs">{formatTimeAgo(reply.created_at)}</span>
                          </div>
                          <p className="text-gray-300 text-sm">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyInput[post.id] || ''}
                      onChange={(e) => setReplyInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleReply(post.id)}
                      placeholder="Write a reply..."
                      className="flex-1 bg-[#0f0f0f] border border-[#2a2a2a] text-white text-sm px-3 py-2 rounded-lg hover:border-[#3a3a3a] focus:border-emerald-500/50 focus:outline-none transition"
                    />
                    <button
                      onClick={() => handleReply(post.id)}
                      disabled={!(replyInput[post.id] || '').trim()}
                      className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white px-3 py-2 rounded-lg transition"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
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

      {/* Copy Trade Modal */}
      {copyModal && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setCopyModal(null)}
        >
          <div
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-4">Copy This Trade?</h3>
            <p className="text-gray-400 text-sm mb-1">
              Trader: <span className="text-white font-medium">{copyModal.username}</span>
            </p>
            <p className="text-emerald-400 text-sm font-semibold mb-4">
              {copyModal.signal} {copyModal.ticker}
            </p>
            <label className="text-gray-500 text-xs block mb-1">Quantity (shares)</label>
            <input
              type="number"
              value={copyQty}
              onChange={(e) => setCopyQty(e.target.value)}
              min="1"
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white px-3 py-2 rounded-lg mb-4 text-sm focus:outline-none focus:border-emerald-500/50"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setCopyModal(null)}
                className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white font-semibold py-2.5 rounded-lg transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCopyLoading(true)
                  try {
                    const res = await fetch('/api/trade', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        ticker: copyModal.ticker,
                        side: copyModal.signal === 'SELL' ? 'sell' : 'buy',
                        qty: copyQty
                      })
                    })
                    await res.json()
                    setCopyModal(null)
                    setToast(`${copyModal.signal} ${copyQty} × ${copyModal.ticker} executed`)
                  } catch (err) {
                    setToast('Trade failed: ' + err.message)
                  } finally {
                    setCopyLoading(false)
                  }
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2.5 rounded-lg transition text-sm"
              >
                {copyLoading ? 'Executing...' : 'Confirm Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FeedScreen
