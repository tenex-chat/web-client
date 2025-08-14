import { memo, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Code2, Square } from 'lucide-react'
import { useNDK, useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { NDKKind, NDKEvent } from '@nostr-dev-kit/ndk'
import { formatRelativeTime } from '@/lib/utils/time'
import { cn } from '@/lib/utils'
import type { NDKTask } from '@/lib/ndk-events/NDKTask'
import { EVENT_KINDS } from '@/lib/constants'
import { logger } from '@/lib/logger'

interface TaskCardProps {
  task: NDKTask
  onClick?: () => void
  className?: string
  showUnread?: boolean
  unreadCount?: number
}


export const TaskCard = memo(
  function TaskCard({ task, onClick, className, showUnread, unreadCount = 0 }: TaskCardProps) {
    const { ndk } = useNDK()

    // Subscribe to task updates
    const { events: updates } = useSubscribe(
      useMemo(
        () => [{
          kinds: [NDKKind.GenericReply as number, EVENT_KINDS.PROJECT_STATUS],
          '#e': [task.id],
          limit: 10
        }],
        [task.id]
      ),
      { closeOnEose: false, groupable: true }
    )

    // Get the latest status update
    const latestUpdate = useMemo(() => {
      if (!updates || updates.length === 0) return null
      return updates.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0]
    }, [updates])

    // Get current status from latest update
    const currentStatus = useMemo(() => {
      if (latestUpdate) {
        const statusTag = latestUpdate.tags?.find(tag => tag[0] === 'status')
        if (statusTag) return statusTag[1]
      }
      return 'pending'
    }, [latestUpdate])

    const isCodeTask = task.tags?.some(tag => tag[0] === 'tool' && tag[1] === 'claude_code')

    // Handle abort button click
    const handleAbort = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!ndk) return

      // Create ephemeral abort event
      const abortEvent = new NDKEvent(ndk)
      abortEvent.kind = 24133 // Ephemeral event for task abort
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

    const contentPreview = task.content?.split('\n').slice(0, 2).join(' ').slice(0, 100) || ''

    return (
      <Card
        className={cn(
          'p-4 cursor-pointer hover:bg-muted/50 transition-all duration-200',
          showUnread && unreadCount > 0 && 'border-blue-500 shadow-sm',
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <Code2 className={cn('w-5 h-5', isCodeTask ? 'text-blue-500' : 'text-gray-400')} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <h4 className="text-sm font-semibold text-foreground flex-1 line-clamp-1">
                {task.title}
              </h4>
              
              <div className="flex items-center gap-2">
                {currentStatus === 'in-progress' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={handleAbort}
                    className="h-6 px-2 text-xs"
                  >
                    <Square className="w-3 h-3 mr-1" />
                    Stop
                  </Button>
                )}
                
                {showUnread && unreadCount > 0 && (
                  <Badge variant="default" className="bg-blue-500">
                    {unreadCount}
                  </Badge>
                )}
              </div>
            </div>

            {latestUpdate ? (
              <div className="mb-3 p-2 border-l-4 border-muted-foreground/20 bg-muted/30 rounded-r">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {latestUpdate.content}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatRelativeTime(latestUpdate.created_at!)}
                </p>
              </div>
            ) : contentPreview ? (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {contentPreview}
              </p>
            ) : null}

            <div className="flex items-center gap-2 flex-wrap">
              {currentStatus && (
                <Badge variant="secondary" className="text-xs">
                  {currentStatus}
                </Badge>
              )}
              
              {isCodeTask && (
                <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  Claude Code
                </Badge>
              )}
              
              {task.assignedTo && (
                <Badge variant="outline" className="text-xs">
                  Assigned
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparison - only re-render if task ID, created_at, or props change
    return (
      prevProps.task.id === nextProps.task.id &&
      prevProps.task.created_at === nextProps.task.created_at &&
      prevProps.onClick === nextProps.onClick &&
      prevProps.className === nextProps.className &&
      prevProps.showUnread === nextProps.showUnread &&
      prevProps.unreadCount === nextProps.unreadCount
    )
  }
)