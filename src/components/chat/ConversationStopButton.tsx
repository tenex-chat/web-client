import { StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConversationOperationStatus } from '@/hooks/useConversationOperationStatus'
import { useStopOperations } from '@/hooks/useStopOperations'

interface ConversationStopButtonProps {
  conversationRootId?: string
  projectId?: string
  size?: "sm" | "default" | "icon"
}

/**
 * Optional conversation-level stop button
 * Only shows when there are active operations for the conversation
 */
export function ConversationStopButton({ 
  conversationRootId, 
  projectId, 
  size = "icon" 
}: ConversationStopButtonProps) {
  const { stopConversation } = useStopOperations(projectId)
  const { hasActiveOperations } = useConversationOperationStatus(conversationRootId, projectId)

  if (!conversationRootId) return null

  if (!hasActiveOperations) return null

  const handleStop = () => {
    stopConversation(conversationRootId)
  }

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleStop}
      className="text-destructive hover:text-destructive hover:bg-destructive/10"
      title="Stop all operations"
    >
      <StopCircle className="h-4 w-4" />
    </Button>
  )
}