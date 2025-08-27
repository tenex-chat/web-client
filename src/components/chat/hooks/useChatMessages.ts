import { useState, useEffect } from 'react'
import { NDKEvent } from '@nostr-dev-kit/ndk'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import { processEventsToMessages } from '@/components/chat/utils/messageProcessor'

export interface Message {
  id: string // Either event.id or synthetic ID for streaming sessions
  event: NDKEvent
}

/**
 * Hook for managing chat messages including streaming sessions
 * Handles event subscription, streaming processing, and message sorting
 */
export function useChatMessages(_project: NDKProject, rootEvent: NDKEvent | null) {
  const [messages, setMessages] = useState<Message[]>([])
  
  // Subscribe to thread messages using NIP-22 threading
  const { events } = useSubscribe(
    rootEvent
      ? [{ ids: [rootEvent.id] }, rootEvent.filter(), rootEvent.nip22Filter()]
      : false,
    { closeOnEose: false, groupable: false, subId: 'use-chat-messages' },
    [rootEvent?.id],
  )

  if (events) {
    for (const e of events) {
      console.log('here', e.content)
    }
  }
  
  // Process thread replies into messages with streaming session management
  useEffect(() => {
    const processedMessages = processEventsToMessages(events, rootEvent)
    setMessages(processedMessages)
  }, [events, rootEvent])

  return messages
}