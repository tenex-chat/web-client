import { useState } from 'react'
import { Activity, StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEventOperationStatus } from '@/hooks/useEventOperationStatus'
import { useStopOperations } from '@/hooks/useStopOperations'

interface EventOperationIndicatorProps {
  eventId: string
  projectId?: string
}

/**
 * Minimal event-level operation indicator
 * Renders only when active, with agent count and stop button
 */
export function EventOperationIndicator({ eventId, projectId }: EventOperationIndicatorProps) {
  const { stopEvent } = useStopOperations(projectId)
  const { isActive, agentCount } = useEventOperationStatus(eventId, projectId)
  const [isStopping, setIsStopping] = useState(false)

  // Render only when active
  if (!isActive || agentCount === 0) return null

  const handleStop = async () => {
    setIsStopping(true)
    await stopEvent(eventId)
    // Note: isStopping state will reset when operation actually stops
    // This is optional local "stopping..." text that doesn't mutate store
    setTimeout(() => setIsStopping(false), 2000) // Fallback reset
  }

  return (
    <div className="flex items-center gap-1 text-xs">
      <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
      <span className="text-blue-600 text-[10px]">{agentCount}</span>
      {isStopping ? (
        <span className="text-[10px] text-muted-foreground">stopping…</span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          className="h-4 w-4 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          title="Stop operations"
        >
          <StopCircle className="h-3 w-3" />
        </Button>
      )}
    </div>
  )
}