import { ReactNode } from 'react'
import { Loader2, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePullToRefresh } from '@/hooks/usePullToRefresh'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className,
  disabled = false 
}: PullToRefreshProps) {
  const {
    containerRef,
    pullDistance,
    isRefreshing,
    pullProgress,
  } = usePullToRefresh({
    onRefresh,
    disabled,
  })
  
  return (
    <div 
      ref={containerRef}
      className={cn('relative h-full overflow-auto', className)}
    >
      {/* Pull to refresh indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center transition-transform duration-200 ease-out pointer-events-none z-10"
        style={{
          transform: `translateY(${pullDistance - 40}px)`,
          opacity: pullProgress,
        }}
      >
        <div className="flex items-center gap-2 px-4 py-2 bg-background/95 backdrop-blur-sm rounded-full shadow-sm border">
          {isRefreshing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Refreshing...</span>
            </>
          ) : (
            <>
              <ArrowDown 
                className={cn(
                  "h-4 w-4 transition-transform",
                  pullProgress >= 1 && "rotate-180"
                )}
              />
              <span className="text-sm font-medium">
                {pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>
      
      {/* Content with transform for pull effect */}
      <div
        className="transition-transform duration-200 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        {children}
      </div>
    </div>
  )
}