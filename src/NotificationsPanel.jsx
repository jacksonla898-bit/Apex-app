import { X, Bell } from 'lucide-react'

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function notifMessage(type, actor, metadata) {
  const name = actor?.username ? `@${actor.username}` : 'Someone'
  const sym  = metadata?.symbol || metadata?.ticker || ''
  switch (type) {
    case 'like':              return `${name} liked your post`
    case 'reply':             return `${name} replied to your post`
    case 'follow':            return `${name} started following you`
    case 'copy_trade':        return `${name} copied your ${sym} trade`
    case 'new_trade':         return `${name} ${metadata?.side === 'sell' ? 'sold' : 'bought'} ${sym}`
    case 'ai_upgrade':        return `AI updated your ${sym} position to ${metadata?.action || ''}`
    case 'top_trader_earned': return `You're now a Top Trader!`
    default:                  return 'New notification'
  }
}

function notifTarget(notif) {
  switch (notif.type) {
    case 'like':
    case 'reply':
    case 'copy_trade':
      return 'feed'
    case 'follow':
      return notif.actor?.id ? { tab: 'profile', actorId: notif.actor.id } : 'feed'
    case 'new_trade':
    case 'ai_upgrade':
      return 'portfolio'
    default:
      return null
  }
}

function Avatar({ username }) {
  const letter = username ? username[0].toUpperCase() : '?'
  return (
    <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
      <span className="text-emerald-400 font-bold text-sm">{letter}</span>
    </div>
  )
}

function NotifRow({ notif, onRead, onClose, onNavigate }) {
  const message = notifMessage(notif.type, notif.actor, notif.metadata)
  const target  = notifTarget(notif)

  const handleClick = () => {
    if (!notif.read) onRead(notif.id)
    onClose()
    if (target && onNavigate) {
      if (typeof target === 'string') {
        onNavigate(target)
      } else {
        onNavigate(target.tab, target)
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition hover:bg-[#222] border-b border-[#2a2a2a] ${
        notif.read ? 'opacity-60' : ''
      }`}
    >
      {notif.actor?.username ? (
        <Avatar username={notif.actor.username} />
      ) : (
        <div className="w-9 h-9 rounded-full bg-[#2a2a2a] flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-gray-400" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-200 leading-snug">{message}</p>
        <p className="text-xs text-gray-500 mt-0.5">{timeAgo(notif.createdAt)}</p>
      </div>
      {!notif.read && (
        <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
      )}
    </button>
  )
}

export default function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkAllRead,
  onMarkRead,
  onNavigate,
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div
        className="absolute right-0 top-0 h-full w-full max-w-sm bg-[#141414] border-l border-[#2a2a2a] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a] bg-[#1a1a1a]">
          <span className="font-bold text-white text-base">Notifications</span>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition font-medium"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && notifications.length === 0 && (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#2a2a2a] border-t-emerald-500 rounded-full animate-spin" />
            </div>
          )}

          {!loading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <Bell className="w-10 h-10 text-gray-600 mb-3" />
              <p className="text-gray-500 text-sm">No notifications yet</p>
              <p className="text-gray-600 text-xs mt-1">
                Likes, replies, and follows will show up here
              </p>
            </div>
          )}

          {notifications.map((n) => (
            <NotifRow
              key={n.id}
              notif={n}
              onRead={onMarkRead}
              onClose={onClose}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
