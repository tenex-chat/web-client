import { cn } from '@/lib/utils'
import type { ExecutionQueue } from '@/lib/ndk-events/NDKProjectStatus'

interface ProjectStatusIndicatorProps {
  status: 'online' | 'offline' | 'busy'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  onClick?: () => void
  executionQueue?: ExecutionQueue | null
}

export function ProjectStatusIndicator({ 
  status, 
  size = 'md', 
  showLabel = false,
  className,
  onClick,
  executionQueue
}: ProjectStatusIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-yellow-500'
  }

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    busy: 'Busy'
  }

  const isClickable = onClick && status === 'offline'
  
  const getTooltipTitle = () => {
    if (isClickable) return 'Click to start project';
    
    let tooltip = statusLabels[status];
    if (executionQueue) {
      if (executionQueue.active) {
        tooltip += ' - Execution active';
      }
      if (executionQueue.totalWaiting > 0) {
        tooltip += ` (${executionQueue.totalWaiting} waiting)`;
      }
    }
    return tooltip;
  }

  return (
    <div 
      className={cn(
        'flex items-center gap-2', 
        isClickable && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={isClickable ? onClick : undefined}
      title={getTooltipTitle()}
    >
      <div className="relative">
        <div 
          className={cn(
            'rounded-full',
            sizeClasses[size],
            statusColors[status]
          )}
        />
        {status === 'online' && (
          <div 
            className={cn(
              'absolute inset-0 rounded-full animate-ping',
              statusColors[status],
              'opacity-75'
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground">
          {statusLabels[status]}
        </span>
      )}
    </div>
  )
}