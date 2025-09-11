import { memo, useState } from 'react'
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks'

interface AIReasoningBlockProps {
  reasoningEvent: NDKEvent
  isStreaming?: boolean
  isMobile?: boolean
}

export const AIReasoningBlock = memo(function AIReasoningBlock({
  reasoningEvent,
  isStreaming = false
}: AIReasoningBlockProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  // Get the reasoning content from the event
  const reasoningContent = reasoningEvent.content || ''
  
  if (!reasoningContent) return null
  
  return (
    <div className="my-2">
      <Reasoning 
        className="w-full" 
        isStreaming={isStreaming}
        open={isOpen}
        onOpenChange={setIsOpen}
      >
        <ReasoningTrigger title="AI Reasoning" />
        <ReasoningContent>
          {reasoningContent}
        </ReasoningContent>
      </Reasoning>
    </div>
  )
})