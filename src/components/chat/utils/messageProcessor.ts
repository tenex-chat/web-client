import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk-hooks'
import { EVENT_KINDS } from '@/lib/constants'
import type { Message } from '@/components/chat/hooks/useChatMessages'

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
  console.log('process', event.content)
  
  // Metadata events should always be shown as final messages
  if (event.kind === EVENT_KINDS.CONVERSATION_METADATA) {
    finalMessages.push({ id: event.id, event: event })
    return
  }
  
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
 * Checks if an event should be shown in the main thread
 * Excludes events that have an "e" tag with "root" marker pointing to the conversation root
 * (these are replies that will be shown nested under other messages)
 */
function isDirectReplyToRoot(event: NDKEvent, rootEvent: NDKEvent | null): boolean {
  if (!rootEvent) return true // If no root, include all events
  
  // The root event itself should always be included
  if (event.id === rootEvent.id) return true
  
  // Check if this event has an "e" tag with "root" marker pointing to our conversation root
  // If it does, it means this is a reply that should be shown nested, not in main thread
  const eTags = event.getMatchingTags('e')
  for (const tag of eTags) {
    // tag format: ["e", "<event-id>", "<relay-url>", "<marker>"]
    if (tag[1] === rootEvent.id && tag[3] === 'root') {
      // This event marks our root as its root, so it's a nested reply
      // Don't show it in the main thread (it will be shown as a nested reply)
      return false
    }
  }
  
  // Include events that don't have a "root" marker to our conversation root
  return true
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
  
  // Sort everything by timestamp
  finalMessages.sort((a, b) => 
    (a.event.created_at || 0) - (b.event.created_at || 0)
  )
  
  return finalMessages
}