import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Heart, Settings, Users, Check, ArrowLeft } from 'lucide-react'
import { TopTraderBadge } from './TopTradersContext'

const Profile = ({ userId, currentUser, onBack, onResetOnboarding }) => {
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [toast, setToast] = useState(null)
  const [userLikes, setUserLikes] = useState({})
  const isOwnProfile = currentUser?.id === userId

  useEffect(() => {
    fetchProfile()
    fetchPosts()
    fetchFollowers()
    fetchFollowing()
    if (!isOwnProfile) {
      checkFollowStatus()
    }
  }, [userId])

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        // Profile doesn't exist — only auto-create for own profile
        if (error.code === 'PGRST116' && currentUser?.id === userId) {
          const email = currentUser.email || `user_${userId.slice(0, 8)}`
          const username = email.split('@')[0]

          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([{
              id: userId,
              username,
              bio: '',
              followers: 0,
              following: 0,
              created_at: new Date().toISOString()
            }])
            .select()
            .single()

          if (insertError) throw insertError
          setProfile(newProfile)
          setEditUsername(newProfile.username || '')
          setEditBio(newProfile.bio || '')
        } else if (error.code !== 'PGRST116') {
          throw error
        }
      } else {
        setProfile(data)
        setEditUsername(data.username || '')
        setEditBio(data.bio || '')
      }
    } catch (err) {
      console.error('Error fetching/creating profile:', err)
      setToast('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
      if (currentUser?.id && userId) fetchUserLikes()
    } catch (err) {
      console.error('Error fetching posts:', err)
    }
  }

  const fetchUserLikes = async () => {
    if (!currentUser) return
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', currentUser.id)

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

  const fetchFollowers = async () => {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)

      if (error) throw error
      setFollowers(count || 0)
    } catch (err) {
      console.error('Error fetching followers:', err)
    }
  }

  const fetchFollowing = async () => {
    try {
      const { count, error } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId)

      if (error) throw error
      setFollowing(count || 0)
    } catch (err) {
      console.error('Error fetching following:', err)
    }
  }

  const checkFollowStatus = async () => {
    if (!currentUser) return
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .single()

      setIsFollowing(!!data)
    } catch (err) {
      setIsFollowing(false)
    }
  }

  const handleFollow = async () => {
    if (!currentUser) {
      setToast('Please log in to follow')
      return
    }

    try {
      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)

        if (error) throw error
        setIsFollowing(false)
        setFollowers(followers - 1)
      } else {
        const { error } = await supabase
          .from('follows')
          .insert([{
            follower_id: currentUser.id,
            following_id: userId
          }])

        if (error) throw error
        setIsFollowing(true)
        setFollowers(followers + 1)
        fetch('/api/notifications', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', type: 'follow', userId, actorId: currentUser.id }),
        }).catch(() => {})
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
      setToast('Failed to update follow status')
    }
  }

  const handleSaveProfile = async () => {
    try {
      // Get current logged-in user
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Error getting user:', userError)
        throw userError
      }

      if (!user) {
        console.error('No user found')
        throw new Error('No user found')
      }

      console.log('Updating profile for user ID:', user.id)
      console.log('Update data:', { username: editUsername, bio: editBio })

      const { error } = await supabase
        .from('profiles')
        .update({
          username: editUsername,
          bio: editBio
        })
        .eq('id', user.id)

      if (error) {
        console.error('Supabase update error:', error)
        throw error
      }

      setProfile({ ...profile, username: editUsername, bio: editBio })
      setEditMode(false)
      setToast('Profile updated!')
    } catch (err) {
      console.error('Error updating profile:', err)
      console.error('Error details:', err.message)
      setToast('Failed to update profile')
    }
  }

  const getInitials = (username) => {
    if (!username) return 'U'
    return username
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
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
        return { bg: 'bg-emerald-500 bg-opacity-20', text: 'text-emerald-400', badge: 'bg-emerald-500' }
      case 'SELL':
        return { bg: 'bg-red-500 bg-opacity-20', text: 'text-red-400', badge: 'bg-red-500' }
      case 'HOLD':
        return { bg: 'bg-yellow-500 bg-opacity-20', text: 'text-yellow-400', badge: 'bg-yellow-500' }
      default:
        return { bg: 'bg-gray-500 bg-opacity-20', text: 'text-gray-400', badge: 'bg-gray-500' }
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="w-8 h-8 border-4 border-[#2a2a2a] border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div>Profile not found</div>
        <button onClick={onBack} className="text-emerald-400 text-sm mt-2 hover:text-emerald-300">
          <ArrowLeft className="w-4 h-4 inline mr-1" />Back
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="text-emerald-400 text-sm font-semibold hover:text-emerald-300 transition"
      >
        <ArrowLeft className="w-4 h-4 inline mr-1" />Back
      </button>

      {/* Profile Header */}
      <div className="bg-[#1a1a1a] rounded-2xl p-5 border border-[#2a2a2a] space-y-4">
        {/* Avatar and Name */}
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500 bg-opacity-30 border-2 border-emerald-500 flex items-center justify-center">
              <div className="text-3xl font-bold text-emerald-400">{getInitials(profile.username || 'User')}</div>
            </div>
            <div>
              {editMode && isOwnProfile ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] text-white px-3 py-1 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-[#0f0f0f]"
                  />
                  <div>
                    <textarea
                      value={editBio}
                      onChange={(e) => { if (e.target.value.length <= 160) setEditBio(e.target.value) }}
                      placeholder="Add a bio..."
                      rows="2"
                      maxLength={160}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-white px-3 py-1 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1 focus:ring-offset-[#0f0f0f]"
                    />
                    <div className="flex justify-end mt-0.5">
                      {(() => {
                        const len = editBio.length
                        const pct = len / 160
                        const color = pct >= 1 ? 'text-red-400' : pct >= 0.8 ? 'text-yellow-400' : 'text-gray-500'
                        return <span className={`text-xs tabular-nums ${color}`}>{len}/160</span>
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-bold text-white text-lg flex items-center gap-2">
                    {profile.username || 'Unknown'}
                    <TopTraderBadge userId={userId} />
                  </div>
                  <div className="text-gray-400 text-sm">{profile.bio || 'No bio yet'}</div>
                </>
              )}
            </div>
          </div>

          {/* Edit/Follow Button */}
          {isOwnProfile ? (
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(false)}
                    className="bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white px-3 py-1.5 rounded-lg text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm transition font-semibold"
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-1.5 rounded-lg text-sm transition font-semibold flex items-center gap-1.5"
                >
                  <Settings className="w-4 h-4" /> Edit Profile
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleFollow}
              className={`px-4 py-1.5 rounded-lg text-sm transition font-semibold ${
                isFollowing
                  ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Reset onboarding (testing) */}
        {isOwnProfile && onResetOnboarding && (
          <div className="pt-2">
            <button
              onClick={onResetOnboarding}
              className="text-gray-600 text-xs hover:text-gray-400 transition underline underline-offset-2"
            >
              Reset onboarding
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#2a2a2a]">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{followers}</div>
            <div className="text-gray-500 text-sm flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" /> Followers
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-400">{following}</div>
            <div className="text-gray-500 text-sm flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5" /> Following
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div>
        <h3 className="text-white font-semibold text-lg mb-3">Posts</h3>
        {posts.length === 0 ? (
          <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a2a2a] text-center">
            <div className="text-gray-400">No posts yet</div>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => {
              const signalColor = getSignalColor(post.signal)
              const isLiked = userLikes[post.id]

              return (
                <div key={post.id} className="bg-[#1a1a1a] rounded-2xl p-4 border border-[#2a2a2a] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-gray-500 text-xs">{formatTimeAgo(post.created_at)}</div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${signalColor.bg} ${signalColor.text} border-opacity-30`}>
                      {post.signal}
                    </span>
                  </div>

                  <p className="text-gray-200 text-sm">{post.content}</p>

                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-blue-500 bg-opacity-20 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-500 border-opacity-30 font-medium">
                      ${post.ticker}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      className={`flex-1 text-sm py-2 rounded-lg transition border flex items-center justify-center gap-1.5 ${
                        isLiked
                          ? 'bg-emerald-500 bg-opacity-20 border-emerald-500 border-opacity-30 text-emerald-400 font-semibold'
                          : 'bg-[#0f0f0f] hover:bg-[#1a1a1a] text-gray-300 border-[#2a2a2a]'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} /> {post.likes || 0}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

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

export default Profile
