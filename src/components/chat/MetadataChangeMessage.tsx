import { NDKEvent } from '@nostr-dev-kit/ndk-hooks'
import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/time'
import { NostrProfile } from '@/components/common/NostrProfile'
import { Edit3, MessageSquareText, Users, Settings, Info } from 'lucide-react'

interface MetadataChangeMessageProps {
  event: NDKEvent
  onTimeClick?: (event: NDKEvent) => void
}

export const MetadataChangeMessage = memo(function MetadataChangeMessage({
  event,
  onTimeClick
}: MetadataChangeMessageProps) {
  
  // Extract all metadata from tags
  const metadata = useMemo(() => {
    const changes: Record<string, any> = {}
    
    // Look for various metadata tags
    event.tags?.forEach(tag => {
      const [key, value] = tag
      switch(key) {
        case 'title':
          changes.title = value
          break
        case 'description':
          changes.description = value
          break
        case 'members':
          changes.members = value
          break
        case 'settings':
          changes.settings = value
          break
        default:
          // Store any other metadata tags
          if (value && !['e', 'p', 'E', 'P', 'a'].includes(key)) {
            changes[key] = value
          }
      }
    })
    
    return {
      changes,
      timestamp: event.created_at
    }
  }, [event])

  if (Object.keys(metadata.changes).length === 0) {
    return null
  }

  const handleTimeClick = () => {
    if (onTimeClick) {
      onTimeClick(event)
    }
  }

  // Determine icon and message based on what changed
  const getChangeDisplay = () => {
    if (metadata.changes.title) {
      return {
        icon: MessageSquareText,
        message: 'changed the conversation title to',
        value: metadata.changes.title,
        showQuotes: true
      }
    }
    if (metadata.changes.description) {
      return {
        icon: Info,
        message: 'updated the description',
        value: metadata.changes.description,
        showQuotes: true
      }
    }
    if (metadata.changes.members) {
      return {
        icon: Users,
        message: 'updated members',
        value: metadata.changes.members,
        showQuotes: false
      }
    }
    if (metadata.changes.settings) {
      return {
        icon: Settings,
        message: 'changed settings',
        value: metadata.changes.settings,
        showQuotes: false
      }
    }
    
    // Generic metadata change
    const firstKey = Object.keys(metadata.changes)[0]
    return {
      icon: Edit3,
      message: `updated ${firstKey}`,
      value: metadata.changes[firstKey],
      showQuotes: true
    }
  }

  const changeDisplay = getChangeDisplay()
  const Icon = changeDisplay.icon

  return (
    <div className={cn(
      "flex items-center justify-center px-4",
      "text-xs text-muted-foreground",
      "select-none",
      "group"
    )}>
      <div className={cn(
        "inline-flex items-center gap-2 px-4 p-2",
        "bg-accent/5 dark:bg-accent/10",
        "rounded-2xl",
        "transition-all duration-200",
        "group-hover:bg-accent/10 dark:group-hover:bg-accent/20"
      )}>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/70" />
        
        <div className="flex items-center gap-1.5">
          <NostrProfile 
            pubkey={event.pubkey} 
            size="sm" 
            variant="name"
            className="font-medium text-foreground/80 hover:text-foreground text-xs"
          />
          
          <span className="text-muted-foreground/70 text-xs">
            {changeDisplay.message}
          </span>
          
          {changeDisplay.showQuotes ? (
            <span className="font-medium text-foreground/90 text-xs">
              "{changeDisplay.value}"
            </span>
          ) : (
            <span className="font-medium text-foreground/90 text-xs">
              {changeDisplay.value}
            </span>
          )}
        </div>
        
        {metadata.timestamp && (
          <>
            <span className="text-muted-foreground/40">·</span>
            <button
              onClick={handleTimeClick}
              className={cn(
                "text-muted-foreground/60 hover:text-muted-foreground/90",
                "transition-colors text-xs",
                "hover:underline cursor-pointer"
              )}
              title={new Date((metadata.timestamp || 0) * 1000).toLocaleString()}
            >
              {formatRelativeTime(metadata.timestamp)}
            </button>
          </>
        )}
      </div>
    </div>
  )
})