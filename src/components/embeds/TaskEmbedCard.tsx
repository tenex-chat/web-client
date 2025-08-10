import { NDKEvent } from '@nostr-dev-kit/ndk'
import { CheckCircle, Circle, Clock, Code2, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils/time'

interface TaskEmbedCardProps {
  event: NDKEvent
  compact?: boolean
  className?: string
  onClick?: () => void
}

export function TaskEmbedCard({ event, compact, className, onClick }: TaskEmbedCardProps) {
  // Extract task data from tags
  const getTaskTitle = () => {
    return event.tags?.find(tag => tag[0] === 'title')?.[1] || 'Untitled Task'
  }

  const getTaskStatus = () => {
    return event.tags?.find(tag => tag[0] === 'status')?.[1] || 'pending'
  }

  const getTaskComplexity = () => {
    const complexity = event.tags?.find(tag => tag[0] === 'complexity')?.[1]
    return complexity ? parseInt(complexity, 10) : null
  }

  const isClaudeCodeTask = () => {
    return event.tags?.some(tag => tag[0] === 'tool' && tag[1] === 'claude_code')
  }

  const title = getTaskTitle()
  const status = getTaskStatus()
  const complexity = getTaskComplexity()
  const isCodeTask = isClaudeCodeTask()

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-green-500', label: 'Completed' }
      case 'progress':
        return { icon: Clock, color: 'text-blue-500', label: 'In Progress' }
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-500', label: 'Failed' }
      default:
        return { icon: Circle, color: 'text-gray-500', label: 'Pending' }
    }
  }

  const statusDisplay = getStatusDisplay()
  const StatusIcon = statusDisplay.icon

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
        <StatusIcon className={cn("w-3.5 h-3.5", statusDisplay.color)} />
        <span className="font-medium">Task: {title}</span>
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
          <StatusIcon className={cn("w-5 h-5", statusDisplay.color)} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h3 className="font-semibold text-base flex items-center gap-2">
                {title}
                {isCodeTask && <Code2 className="w-4 h-4 text-purple-500" />}
              </h3>
              
              {event.content && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {event.content}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-3">
            <Badge variant={status === 'completed' ? 'default' : 'secondary'} className="text-xs">
              {statusDisplay.label}
            </Badge>
            
            {complexity && (
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      i < complexity ? "bg-primary" : "bg-muted"
                    )}
                  />
                ))}
              </div>
            )}
            
            {event.created_at && (
              <span className="text-xs text-muted-foreground">
                {formatRelativeTime(event.created_at * 1000)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}