import { memo, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Square } from 'lucide-react'
import { useNDK, useSubscribe, useProfile } from '@nostr-dev-kit/ndk-hooks'
import { NDKKind, NDKEvent } from '@nostr-dev-kit/ndk'
import { formatRelativeTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import type { NDKTask } from '@/lib/ndk-events/NDKTask'
import { NDKProjectStatus } from '@/lib/ndk-events/NDKProjectStatus'
import { logger } from '@/lib/logger'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface CompactTaskCardProps {
  task: NDKTask
  onClick?: () => void
}

/**
 * Compact task card that shows only the latest update and status
 * Used for subsequent task messages in chat (not the first one)
 */
export const CompactTaskCard = memo(function CompactTaskCard({ 
  task, 
  onClick
}: CompactTaskCardProps) {
  const { ndk } = useNDK()
  const assignedProfile = useProfile(task.assignedTo || '')

  // Subscribe to task updates
  const { events: updates } = useSubscribe(
    useMemo(
      () => [{
        kinds: [NDKKind.GenericReply as number, NDKProjectStatus.kind],
        '#e': [task.id],
        limit: 10
      }],
      [task.id]
    ),
    { closeOnEose: false, groupable: true }
  )

  // Get the latest update
  const latestUpdate = useMemo(() => {
    if (!updates || updates.length === 0) return null
    return updates.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0]
  }, [updates])

  // Get current status from the latest update that has a status tag
  const currentStatus = useMemo(() => {
    if (!updates || updates.length === 0) return 'pending'
    
    const sortedUpdates = [...updates].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
    
    for (const update of sortedUpdates) {
      const statusTag = update.tags?.find(tag => tag[0] === 'status')
      if (statusTag && statusTag[1]) {
        return statusTag[1]
      }
    }
    
    return 'pending'
  }, [updates])

  // Handle abort button click
  const handleAbort = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!ndk) return

    const abortEvent = new NDKEvent(ndk)
    abortEvent.kind = 24133
    abortEvent.tags = [
      ['e', task.id, '', 'task'],
    ]
    abortEvent.content = 'abort'

    try {
      await abortEvent.publish()
    } catch (error) {
      logger.error('Failed to publish abort event:', error)
    }
  }

  return (
    <div 
      className={cn(
        "cursor-pointer rounded-lg border border-muted/50 bg-muted/10 p-3 transition-all hover:bg-muted/20 hover:border-muted"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Agent avatar with status indicator */}
        {task.assignedTo && (
          <div className="flex flex-col items-center gap-1">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={assignedProfile?.image || assignedProfile?.picture} 
                alt={assignedProfile?.displayName || assignedProfile?.name || 'Agent'} 
              />
              <AvatarFallback className="text-xs">
                {(assignedProfile?.displayName || assignedProfile?.name || task.assignedTo.slice(0, 2)).slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Badge 
              variant="secondary" 
              className={cn(
                "text-[10px] px-1.5 py-0 h-5",
                currentStatus === 'completed' && "bg-green-500 text-white hover:bg-green-600",
                currentStatus === 'in-progress' && "bg-blue-500 text-white hover:bg-blue-600",
                currentStatus === 'pending' && "bg-yellow-500 text-white hover:bg-yellow-600"
              )}
            >
              {currentStatus === 'completed' ? '✓' : 
               currentStatus === 'in-progress' ? '⚡' : 
               '⏳'}
            </Badge>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {/* Show latest update if available */}
          {latestUpdate && (
            <div className="mb-2">
              <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-2">
                {latestUpdate.content}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatRelativeTime(latestUpdate.created_at!)}
              </p>
            </div>
          )}

          {/* Abort button if in progress */}
          {currentStatus === 'in-progress' && (
            <div className="flex items-center">
              <Button
                size="sm"
                variant="destructive"
                onClick={handleAbort}
                className="h-6 px-2 text-xs"
              >
                <Square className="w-3 h-3 mr-1" />
                Stop
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})