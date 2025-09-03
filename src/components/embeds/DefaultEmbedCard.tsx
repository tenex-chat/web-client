import { NDKEvent } from '@nostr-dev-kit/ndk-hooks'
import { Zap, Hash, Calendar } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/time'
import { NostrProfile } from '@/components/common/NostrProfile'

interface DefaultEmbedCardProps {
  event: NDKEvent
  compact?: boolean
  className?: string
  onClick?: () => void
}

export function DefaultEmbedCard({ event, compact, className, onClick }: DefaultEmbedCardProps) {
  // Try to get a title or name from tags
  const getTitle = () => {
    const titleTag = event.tags?.find(tag => tag[0] === 'title' || tag[0] === 'name')
    if (titleTag) return titleTag[1]
    
    // For replaceable events, use the d tag
    const dTag = event.tags?.find(tag => tag[0] === 'd')
    if (dTag) return dTag[1]
    
    return `Kind ${event.kind} Event`
  }

  const title = getTitle()
  const hasContent = event.content && event.content.length > 0

  if (compact) {
    return (
      <span
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "bg-muted/50 hover:bg-muted transition-colors cursor-pointer",
          "text-sm my-1",
          className
        )}
      >
        <Zap className="w-3.5 h-3.5" />
        <span className="font-medium">{title}</span>
      </span>
    )
  }

  return (
    <Card 
      onClick={onClick}
      className={cn(
        "my-3 p-4 cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/20",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-base">{title}</h3>
            <Badge variant="outline" className="text-xs">
              Kind {event.kind}
            </Badge>
          </div>
          
          {hasContent && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {event.content.slice(0, 150)}
              {event.content.length > 150 && '...'}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <NostrProfile pubkey={event.pubkey} />
            </div>
            
            {event.created_at && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatRelativeTime(event.created_at * 1000)}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <Hash className="w-3 h-3" />
              <span className="font-mono">
                {event.id.substring(0, 8)}...
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}