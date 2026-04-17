import { createContext, useContext } from 'react'
import { Star } from 'lucide-react'

export const TopTradersContext = createContext(new Set())

export const useTopTraders = () => useContext(TopTradersContext)

export const TopTraderBadge = ({ userId }) => {
  const topTraderIds = useTopTraders()
  if (!userId || !topTraderIds.has(userId)) return null
  return (
    <span title="Top Trader" className="inline-flex items-center shrink-0">
      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
    </span>
  )
}
