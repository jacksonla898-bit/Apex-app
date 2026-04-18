import { createClient } from '@supabase/supabase-js'

const VALID_TYPES = new Set([
  'like', 'reply', 'follow', 'copy_trade',
  'ai_upgrade', 'new_trade', 'top_trader_earned',
])

function makeClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // ── GET: inbox ──────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const { userId } = req.query
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    const supabase = makeClient()

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('notifications fetch error:', error.message, error.code)
      return res.status(500).json({ error: error.message })
    }

    const unreadCount = (data || []).filter(n => !n.read).length

    // Resolve actor usernames in one batch query
    const actorIds = [...new Set((data || []).map(n => n.actor_id).filter(Boolean))]
    let usernameMap = {}
    if (actorIds.length > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('user_id, username')
        .in('user_id', actorIds)
      for (const p of (profiles || [])) {
        usernameMap[p.user_id] = p.username
      }
    }

    const notifications = (data || []).map(n => ({
      id:          n.id,
      type:        n.type,
      entityId:    n.entity_id,
      metadata:    n.metadata,
      read:        n.read,
      createdAt:   n.created_at,
      actor: n.actor_id ? {
        id:       n.actor_id,
        username: usernameMap[n.actor_id] || null,
      } : null,
    }))

    return res.status(200).json({ notifications, unreadCount })
  }

  // ── POST ────────────────────────────────────────────────────────────────────
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { action } = req.body
  const supabase = makeClient()

  // ── create ──────────────────────────────────────────────────────────────────
  if (action === 'create') {
    const { userId, actorId, type, entityId, metadata } = req.body

    if (!type || !VALID_TYPES.has(type)) {
      return res.status(400).json({ error: 'Invalid notification type' })
    }

    // new_trade: fan-out to all followers of actorId
    if (type === 'new_trade') {
      if (!actorId) return res.status(400).json({ error: 'actorId is required for new_trade' })

      const { data: follows, error: followsErr } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', actorId)

      if (followsErr) {
        console.error('new_trade follows fetch error:', followsErr.message)
        return res.status(500).json({ error: followsErr.message })
      }

      const followerIds = (follows || []).map(f => f.follower_id)
      if (followerIds.length === 0) return res.status(200).json({ success: true, count: 0 })

      const rows = followerIds.map(fid => ({
        user_id:   fid,
        actor_id:  actorId,
        type:      'new_trade',
        entity_id: entityId || null,
        metadata:  metadata || null,
      }))

      const { error: insertErr } = await supabase.from('notifications').insert(rows)
      if (insertErr) {
        console.error('new_trade insert error:', insertErr.message)
        return res.status(500).json({ error: insertErr.message })
      }

      return res.status(200).json({ success: true, count: followerIds.length })
    }

    // All other types: single recipient
    if (!userId) return res.status(400).json({ error: 'userId is required' })
    if (userId === actorId) return res.status(200).json({ success: true, skipped: 'self' })

    const { data: row, error: insertErr } = await supabase
      .from('notifications')
      .insert({
        user_id:   userId,
        actor_id:  actorId || null,
        type,
        entity_id: entityId || null,
        metadata:  metadata || null,
      })
      .select('id')
      .single()

    if (insertErr) {
      console.error('notification insert error:', insertErr.message, insertErr.code)
      return res.status(500).json({ error: insertErr.message })
    }

    return res.status(200).json({ success: true, notificationId: row.id })
  }

  // ── markRead ─────────────────────────────────────────────────────────────────
  if (action === 'markRead') {
    const { userId, notificationId } = req.body
    if (!userId || !notificationId) {
      return res.status(400).json({ error: 'userId and notificationId are required' })
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)

    if (error) {
      console.error('markRead error:', error.message)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  }

  // ── markAllRead ───────────────────────────────────────────────────────────────
  if (action === 'markAllRead') {
    const { userId } = req.body
    if (!userId) return res.status(400).json({ error: 'userId is required' })

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)

    if (error) {
      console.error('markAllRead error:', error.message)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ success: true })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
