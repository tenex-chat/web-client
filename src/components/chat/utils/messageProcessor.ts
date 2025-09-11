import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk-hooks'
import { EVENT_KINDS } from '@/lib/constants'
import type { Message } from '@/components/chat/hooks/useChatMessages'
import { DeltaContentAccumulator } from '@/lib/deltaContentAccumulator'

interface StreamingSession {
  syntheticId: string
  latestEvent: NDKEvent
  accumulator: DeltaContentAccumulator
  reconstructedContent: string
}

/**
 * Sorts events by creation time and kind
 */
export function sortEvents(events: NDKEvent[]): NDKEvent[] {
  return [...events].sort((a, b) => {
    // Primary sort: by creation time (ascending)
    const timeA = a.created_at ?? 0
    const timeB = b.created_at ?? 0

    if (timeA !== timeB) {
      return timeA - timeB
    }

    // Secondary sort: by kind (descending - higher kinds first)
    const kindA = a.kind ?? 0
    const kindB = b.kind ?? 0
    return kindB - kindA
  })
}

/**
 * Processes a single event and updates streaming sessions
 */
export function processEvent(
  event: NDKEvent,
  streamingSessions: Map<string, StreamingSession>,
  finalMessages: Message[]
): void {
  // Skip operations status events (24133) and stop request events (24134)
  if (event.kind === 24133 || event.kind === 24134) {
    return
  }
  
  // Metadata events should always be shown as final messages
  if (event.kind === EVENT_KINDS.CONVERSATION_METADATA) {
    finalMessages.push({ id: event.id, event: event })
    return
  }
  
  if (event.kind === EVENT_KINDS.STREAMING_RESPONSE) {
    // Handle delta-based streaming response
    let session = streamingSessions.get(event.pubkey)
    
    if (!session) {
      // New streaming session - create stable synthetic ID and accumulator
      const accumulator = new DeltaContentAccumulator()
      const reconstructedContent = accumulator.addEvent(event)
      
      session = {
        syntheticId: `streaming-${event.pubkey}-${Date.now()}`,
        latestEvent: event,
        accumulator,
        reconstructedContent
      }
      streamingSessions.set(event.pubkey, session)
    } else {
      // Add delta to existing session and reconstruct content
      session.reconstructedContent = session.accumulator.addEvent(event)
      session.latestEvent = event
    }
  } else if (event.kind === EVENT_KINDS.TYPING_INDICATOR) {
    // Handle typing indicator separately (not delta-based)
    let session = streamingSessions.get(event.pubkey)
    
    if (!session) {
      session = {
        syntheticId: `streaming-${event.pubkey}-${Date.now()}`,
        latestEvent: event,
        accumulator: new DeltaContentAccumulator(), // Not used for typing
        reconstructedContent: event.content
      }
      streamingSessions.set(event.pubkey, session)
    } else {
      session.latestEvent = event
      session.reconstructedContent = event.content
    }
  } else if (event.kind === EVENT_KINDS.TYPING_INDICATOR_STOP) {
    const session = streamingSessions.get(event.pubkey)
    if (session?.latestEvent?.kind === EVENT_KINDS.TYPING_INDICATOR) {
      streamingSessions.delete(event.pubkey)
    }
  } else {
    finalMessages.push({ id: event.id, event: event })
    if (event.kind === NDKKind.GenericReply) {
      streamingSessions.delete(event.pubkey)
    }
  }
}

/**
 * Converts streaming sessions to messages
 */
export function streamingSessionsToMessages(
  streamingSessions: Map<string, StreamingSession>
): Message[] {
  const messages: Message[] = []
  streamingSessions.forEach(session => {
    // Create a synthetic event with reconstructed content for streaming responses
    if (session.latestEvent.kind === EVENT_KINDS.STREAMING_RESPONSE) {
      // Clone the latest event but use reconstructed content
      const syntheticEvent = new NDKEvent(session.latestEvent.ndk)
      syntheticEvent.kind = session.latestEvent.kind
      syntheticEvent.pubkey = session.latestEvent.pubkey
      syntheticEvent.created_at = session.latestEvent.created_at
      syntheticEvent.tags = session.latestEvent.tags
      syntheticEvent.content = session.reconstructedContent // Use reconstructed content
      syntheticEvent.id = session.latestEvent.id
      syntheticEvent.sig = session.latestEvent.sig
      
      messages.push({
        id: session.syntheticId,
        event: syntheticEvent,
      })
    } else {
      // For non-streaming events (like typing indicators), use original event
      messages.push({
        id: session.syntheticId,
        event: session.latestEvent,
      })
    }
  })
  return messages
}

/**
 * Checks if an event is a direct reply to the root event
 * (has an "e" tag pointing to the root, not just an "E" tag)
 */
function isDirectReplyToRoot(event: NDKEvent, rootEvent: NDKEvent | null): boolean {
  if (!rootEvent) return true // If no root, include all events
  
  // The root event itself should always be included
  if (event.id === rootEvent.id) return true
  
  // Check if this event has a lowercase "e" tag pointing to the root
  const eTags = event.getMatchingTags('e')
  return eTags.some(tag => tag[1] === rootEvent.id)
}

/**
 * Processes all events into final messages with streaming session management
 */
export function processEventsToMessages(events: NDKEvent[], rootEvent: NDKEvent | null = null): Message[] {
  const finalMessages: Message[] = []
  const streamingSessions = new Map<string, StreamingSession>()
  
  // Sort events chronologically
  const sortedEvents = sortEvents(events)
  
  // Process each event
  for (const event of sortedEvents) {
    // Only include direct replies to the root event in the main conversation view
    // Nested replies will still be accessible through their parent's reply count
    if (isDirectReplyToRoot(event, rootEvent)) {
      processEvent(event, streamingSessions, finalMessages)
    }
  }
  
  // Add active streaming sessions to final messages
  const streamingMessages = streamingSessionsToMessages(streamingSessions)
  finalMessages.push(...streamingMessages)
  
  // Sort everything by timestamp (filter out messages without timestamps)
  const messagesWithTime = finalMessages
    .filter(msg => msg.event.created_at !== undefined)
    .sort((a, b) => {
      const timeDiff = a.event.created_at - b.event.created_at
      // If timestamps are equal, prioritize "reasoning" events to show them first
      if (timeDiff === 0) {
        const aHasReasoning = a.event.hasTag('reasoning')
        const bHasReasoning = b.event.hasTag('reasoning')
        
        // Events with "reasoning" tag should come first (on top)
        if (aHasReasoning && !bHasReasoning) return -1
        if (!aHasReasoning && bHasReasoning) return 1
      }
      return timeDiff
    })
  
  return messagesWithTime
}