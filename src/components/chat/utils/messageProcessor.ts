import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk-hooks'
import { EVENT_KINDS } from '@/lib/constants'
import type { Message } from '../hooks/useChatMessages'

interface StreamingSession {
  syntheticId: string
  latestEvent: NDKEvent
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
  if (
    event.kind === EVENT_KINDS.STREAMING_RESPONSE ||
    event.kind === EVENT_KINDS.TYPING_INDICATOR
  ) {
    // Update or create streaming session
    let session = streamingSessions.get(event.pubkey)
    
    if (!session) {
      // New streaming session - create stable synthetic ID
      session = {
        syntheticId: `streaming-${event.pubkey}-${Date.now()}`,
        latestEvent: event
      }
      streamingSessions.set(event.pubkey, session)
    } else {
      // Update existing session with latest event
      session.latestEvent = event
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
    messages.push({
      id: session.syntheticId,
      event: session.latestEvent,
    })
  })
  return messages
}

/**
 * Processes all events into final messages with streaming session management
 */
export function processEventsToMessages(events: NDKEvent[]): Message[] {
  const finalMessages: Message[] = []
  const streamingSessions = new Map<string, StreamingSession>()
  
  // Sort events chronologically
  const sortedEvents = sortEvents(events)
  
  // Process each event
  for (const event of sortedEvents) {
    processEvent(event, streamingSessions, finalMessages)
  }
  
  // Add active streaming sessions to final messages
  const streamingMessages = streamingSessionsToMessages(streamingSessions)
  finalMessages.push(...streamingMessages)
  
  // Sort everything by timestamp
  finalMessages.sort((a, b) => 
    (a.event.created_at || 0) - (b.event.created_at || 0)
  )
  
  return finalMessages
}