import { cn } from '../../lib/utils'

interface ProjectStatusIndicatorProps {
  status: 'online' | 'offline' | 'busy'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export function ProjectStatusIndicator({ 
  status, 
  size = 'md', 
  showLabel = false,
  className 
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

  return (
    <div className={cn('flex items-center gap-2', className)}>
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