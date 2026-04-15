import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Heart, MessageCircle, PlusCircle, Check } from 'lucide-react'

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
  const [userLikes, setUserLikes] = useState({})
  const [replies, setReplies] = useState({})
  const [expandedReplies, setExpandedReplies] = useState({})
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyContent, setReplyContent] = useState('')

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

  const handleReply = async (postId) => {
    if (!replyContent.trim()) return
    if (!user) {
      setToast('Please log in to reply')
      return
    }

    try {
      const { error } = await supabase.from('replies').insert([
        {
          post_id: postId,
          user_id: user.id,
          content: replyContent.trim(),
          created_at: new Date().toISOString()
        }
      ])

      if (error) throw error
      setReplyContent('')
      setReplyingTo(null)
      fetchReplies()
    } catch (err) {
      console.error('Error posting reply:', err)
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
        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
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
                  className={`flex-1 text-sm py-2 rounded-lg transition border flex items-center justify-center gap-1.5 ${
                    isLiked
                      ? 'bg-emerald-500 bg-opacity-20 border-emerald-500 border-opacity-30 text-emerald-400 font-semibold'
                      : 'bg-[#0f0f0f] hover:bg-[#1a1a1a] text-gray-300 border-[#2a2a2a]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} /> {post.likes || 0}
                </button>
                <button
                  onClick={() => setReplyingTo(replyingTo === post.id ? null : post.id)}
                  className="flex-1 bg-[#0f0f0f] hover:bg-[#1a1a1a] text-gray-300 text-sm py-2 rounded-lg transition border border-[#2a2a2a] flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-4 h-4" /> {repliesCount}
                </button>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCopyModal(post); setCopyQty(1); }} style={{background:'#22c55e', color:'white', border:'none', padding:'6px 14px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', fontWeight:'500'}}>Copy Trade</button>
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

      {copyModal && (
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.8)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={() => setCopyModal(null)}>
          <div style={{background:'#1a1a1a',padding:'24px',borderRadius:'12px',width:'320px'}} onClick={(e) => e.stopPropagation()}>
            <h3 style={{color:'white',marginBottom:'16px'}}>Copy This Trade?</h3>
            <p style={{color:'#888',marginBottom:'8px'}}>Trader: {copyModal.username}</p>
            <p style={{color:'#22c55e',marginBottom:'8px'}}>Signal: {copyModal.signal} {copyModal.ticker}</p>
            <input type="number" value={copyQty} onChange={(e) => setCopyQty(e.target.value)} min="1" style={{width:'100%',padding:'8px',marginBottom:'16px',background:'#333',color:'white',border:'1px solid #444',borderRadius:'6px'}} />
            <div style={{display:'flex',gap:'8px'}}>
              <button onClick={() => setCopyModal(null)} style={{flex:1,padding:'10px',background:'#333',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>Cancel</button>
              <button onClick={async (e) => {
                e.preventDefault()
                e.stopPropagation()
                setCopyLoading(true)
                try {
                  const res = await fetch('/api/trade', {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ticker: copyModal.ticker, side: copyModal.signal === 'SELL' ? 'sell' : 'buy', qty: copyQty})
                  })
                  const data = await res.json()
                  setCopyModal(null)
                  setToast('Trade executed! ' + copyModal.signal + ' ' + copyQty + ' shares of ' + copyModal.ticker)
                  setTimeout(() => setToast(null), 3000)
                } catch(err) {
                  setToast('Trade failed: ' + err.message)
                  setTimeout(() => setToast(null), 3000)
                }
                setCopyLoading(false)
              }} style={{flex:1,padding:'10px',background:'#22c55e',color:'white',border:'none',borderRadius:'6px',cursor:'pointer'}}>
                {copyLoading ? 'Executing...' : 'Confirm Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={{position:'fixed',top:'20px',left:'50%',transform:'translateX(-50%)',background:'#22c55e',color:'white',padding:'12px 24px',borderRadius:'8px',zIndex:2000}}>{toast}</div>}
    </div>
  )
}

export default FeedScreen