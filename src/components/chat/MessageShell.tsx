import { NDKEvent } from '@nostr-dev-kit/ndk'
import { memo, ReactNode, useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'
import { RecipientAvatars } from '@/components/common/RecipientAvatars'
import { formatRelativeTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import { getUserStatus } from '@/lib/utils/userStatus'
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { Badge } from '@/components/ui/badge'

interface MessageShellProps {
  event: NDKEvent
  project: NDKProject | null | undefined
  children: ReactNode
  className?: string
  isNested?: boolean
  headerActions?: ReactNode
  onTimeClick?: (event: NDKEvent) => void
}

/**
 * Unified message shell component that provides consistent structure
 * for all event types (messages, tasks, etc.) in the chat interface
 */
export const MessageShell = memo(function MessageShell({
  event,
  project,
  children,
  className,
  isNested = false,
  headerActions,
  onTimeClick
}: MessageShellProps) {
  const user = useNDKCurrentUser()
  
  // Get user status (external or belonging to another project)
  const userStatus = useMemo(() => {
    return getUserStatus(event.pubkey, user?.pubkey, project?.dTag)
  }, [event.pubkey, user?.pubkey, project?.dTag])
  
  // Extract p-tags (recipients) from the event
  const recipientPubkeys = useMemo(() => {
    if (!event.tags) return []
    return event.tags
      .filter(tag => tag[0] === 'p' && tag[1])
      .map(tag => tag[1])
      .filter((pubkey, index, self) => self.indexOf(pubkey) === index) // Remove duplicates
  }, [event.tags])
  
  // Extract tool tag if present
  const toolName = useMemo(() => {
    return event.tagValue('tool')
  }, [event])

  return (
    <div className={cn(
      "group hover:bg-muted/30 transition-colors px-4 py-1",
      isNested && "ml-10",
      className
    )}>
      {/* Message - Slack style layout */}
      <div className="flex gap-3">
        {/* Avatar column - fixed width */}
        <div className="flex-shrink-0 pt-0.5">
          <Link 
            to="/p/$pubkey" 
            params={{ pubkey: event.pubkey }}
            className="block hover:opacity-80 transition-opacity"
          >
            <ProfileDisplay 
              pubkey={event.pubkey} 
              size="md" 
              showName={false}
              showAvatar={true}
              avatarClassName="h-9 w-9 rounded-md"
            />
          </Link>
        </div>
        
        {/* Content column */}
        <div className="flex-1 min-w-0">
          {/* Header row with name, time, and actions */}
          <div className="flex items-start justify-between gap-2 mb-0.5">
            <div className="flex items-baseline gap-2 flex-wrap">
              <Link 
                to="/p/$pubkey" 
                params={{ pubkey: event.pubkey }}
                className="hover:underline"
              >
                <ProfileDisplay 
                  pubkey={event.pubkey} 
                  size="md" 
                  showName={true}
                  showAvatar={false}
                  nameClassName="text-sm font-semibold text-foreground"
                />
              </Link>
              {userStatus.isExternal && (
                <span className="text-xs text-muted-foreground">
                  ({userStatus.projectName || 'external'})
                </span>
              )}
              {toolName && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  {toolName}
                </Badge>
              )}
              <button
                onClick={() => onTimeClick?.(event)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:underline"
                title="Open as root conversation"
              >
                {formatRelativeTime(event.created_at!)}
              </button>
              {recipientPubkeys.length > 0 && (
                <>
                  <span className="text-xs text-muted-foreground">→</span>
                  <RecipientAvatars 
                    pubkeys={recipientPubkeys}
                    className="ml-1"
                  />
                </>
              )}
            </div>
            
            {/* Action buttons - only visible on hover */}
            {headerActions && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {headerActions}
              </div>
            )}
          </div>
          
          {/* Content area - children will be rendered here */}
          {children}
        </div>
      </div>
    </div>
  )
})