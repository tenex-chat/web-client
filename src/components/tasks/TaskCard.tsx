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
import { NDKProjectStatus } from '@/lib/ndk-events/NDKProjectStatus'
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
					[
						{
							kinds: [NDKKind.GenericReply as number, NDKProjectStatus.kind],
							"#e": [task.id],
						},
					],
					{ closeOnEose: false, groupable: true },
					[task.id],
				);

    // Get the latest status update
    const latestUpdate = useMemo(() => {
      if (!updates || updates.length === 0) return null
      return updates.sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))[0]
    }, [updates])

    // Get current status from the latest update that has a status tag
    const currentStatus = useMemo(() => {
      if (!updates || updates.length === 0) return 'pending'
      
      // Sort updates by timestamp and find the latest one with a status tag
      const sortedUpdates = [...updates].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0))
      
      for (const update of sortedUpdates) {
        const statusTag = update.tags?.find(tag => tag[0] === 'status')
        if (statusTag && statusTag[1]) {
          return statusTag[1]
        }
      }
      
      // Default to pending if no status found in any update
      return 'pending'
    }, [updates])

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

    const taskContent = task.content || ''

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

            {/* Show original task content if available */}
            {taskContent && (
              <p className="text-xs text-muted-foreground mb-2 whitespace-pre-wrap">
                {taskContent}
              </p>
            )}

            {/* Show latest update if available */}
            {latestUpdate && (
              <div className="mb-3 p-2 border-l-4 border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20 rounded-r">
                <p className="text-xs font-medium text-muted-foreground mb-1">Latest update:</p>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {latestUpdate.content}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {formatRelativeTime(latestUpdate.created_at!)}
                </p>
              </div>
            )}

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