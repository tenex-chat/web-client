import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { EVENT_KINDS } from "@/lib/constants";
import type { Message } from "@/components/chat/hooks/useChatMessages";
import { DeltaContentAccumulator } from "@/lib/deltaContentAccumulator";
import { findTagValue } from "@/lib/utils/nostrUtils";
import { type ThreadViewMode } from "@/stores/thread-view-mode-store";

interface StreamingSession {
  syntheticId: string;
  latestEvent: NDKEvent;
  accumulator: DeltaContentAccumulator;
  reconstructedContent: string;
}

/**
 * Sorts events by creation time and kind
 */
export function sortEvents(events: NDKEvent[]): NDKEvent[] {
  return [...events].sort((a, b) => {
    // Primary sort: by creation time (ascending)
    const timeA = a.created_at ?? 0;
    const timeB = b.created_at ?? 0;

    if (timeA !== timeB) {
      return timeA - timeB;
    }

    // Secondary sort: by kind (descending - higher kinds first)
    const kindA = a.kind ?? 0;
    const kindB = b.kind ?? 0;
    return kindB - kindA;
  });
}

/**
 * Processes a single event and updates streaming sessions
 */
export function processEvent(
  event: NDKEvent,
  streamingSessions: Map<string, StreamingSession>,
  finalMessages: Message[],
): void {
  // Skip operations status events (24133) and stop request events (24134)
  if (event.kind === 24133 || event.kind === 24134) {
    return;
  }

  // Skip events with tool tags (similar to typing/reasoning indicators)
  // if (event.hasTag("tool")) {
  //   return;
  // }

  // Metadata events should always be shown as final messages
  if (event.kind === EVENT_KINDS.CONVERSATION_METADATA) {
    finalMessages.push({ id: event.id, event: event });
    return;
  }

  // Check for React component events (kind 1111 with ["component", "react"] tag)
  if (event.kind === NDKKind.GenericReply) {
    const componentTag = event.tags.find(tag => tag[0] === "component" && tag[1] === "react");
    if (componentTag) {
      // Extract component code from content
      const componentCode = event.content;
      
      // Extract props from ["props", "json_string"] tag if present
      let reactComponentProps: Record<string, any> | undefined;
      const propsTag = findTagValue(event, "props");
      if (propsTag) {
        try {
          reactComponentProps = JSON.parse(propsTag);
        } catch (error) {
          console.error("Failed to parse React component props:", error);
          reactComponentProps = undefined;
        }
      }

      finalMessages.push({
        id: event.id,
        event: event,
        isReactComponent: true,
        reactComponentCode: componentCode,
        reactComponentProps,
      });
      return;
    }
  }

  if (event.kind === EVENT_KINDS.STREAMING_RESPONSE) {
    // Handle delta-based streaming response
    let session = streamingSessions.get(event.pubkey);

    if (!session) {
      // New streaming session - create stable synthetic ID and accumulator
      const accumulator = new DeltaContentAccumulator();
      const reconstructedContent = accumulator.addEvent(event);

      session = {
        syntheticId: `streaming-${event.pubkey}-${Date.now()}`,
        latestEvent: event,
        accumulator,
        reconstructedContent,
      };
      streamingSessions.set(event.pubkey, session);
    } else {
      // Add delta to existing session and reconstruct content
      session.reconstructedContent = session.accumulator.addEvent(event);
      session.latestEvent = event;
    }
  } else if (event.kind === EVENT_KINDS.TYPING_INDICATOR) {
    // Handle typing indicator separately (not delta-based)
    let session = streamingSessions.get(event.pubkey);

    if (!session) {
      session = {
        syntheticId: `streaming-${event.pubkey}-${Date.now()}`,
        latestEvent: event,
        accumulator: new DeltaContentAccumulator(), // Not used for typing
        reconstructedContent: event.content,
      };
      streamingSessions.set(event.pubkey, session);
    } else {
      session.latestEvent = event;
      session.reconstructedContent = event.content;
    }
  } else if (event.kind === EVENT_KINDS.TYPING_INDICATOR_STOP) {
    const session = streamingSessions.get(event.pubkey);
    if (session?.latestEvent?.kind === EVENT_KINDS.TYPING_INDICATOR) {
      streamingSessions.delete(event.pubkey);
    }
  } else {
    finalMessages.push({ id: event.id, event: event });
    if (event.kind === NDKKind.GenericReply) {
      streamingSessions.delete(event.pubkey);
    }
  }
}

/**
 * Converts streaming sessions to messages
 */
export function streamingSessionsToMessages(
  streamingSessions: Map<string, StreamingSession>,
): Message[] {
  const messages: Message[] = [];
  streamingSessions.forEach((session) => {
    // Create a synthetic event with reconstructed content for streaming responses
    if (session.latestEvent.kind === EVENT_KINDS.STREAMING_RESPONSE) {
      // Clone the latest event but use reconstructed content
      const syntheticEvent = new NDKEvent(session.latestEvent.ndk);
      syntheticEvent.kind = session.latestEvent.kind;
      syntheticEvent.pubkey = session.latestEvent.pubkey;
      syntheticEvent.created_at = session.latestEvent.created_at;
      syntheticEvent.tags = session.latestEvent.tags;
      syntheticEvent.content = session.reconstructedContent; // Use reconstructed content
      syntheticEvent.id = session.latestEvent.id;
      syntheticEvent.sig = session.latestEvent.sig;

      messages.push({
        id: session.syntheticId,
        event: syntheticEvent,
      });
    } else {
      // For non-streaming events (like typing indicators), use original event
      messages.push({
        id: session.syntheticId,
        event: session.latestEvent,
      });
    }
  });
  return messages;
}

/**
 * Checks if an event is a direct reply to the root event
 * (has an "e" tag pointing to the root, not just an "E" tag)
 */
function isDirectReplyToRoot(
  event: NDKEvent,
  rootEvent: NDKEvent | null,
): boolean {
  if (!rootEvent) return true; // If no root, include all events

  // The root event itself should always be included
  if (event.id === rootEvent.id) return true;

  // Check if this event has a lowercase "e" tag pointing to the root
  const eTags = event.getMatchingTags("e");
  return eTags.some((tag) => tag[1] === rootEvent.id);
}

/**
 * Gets all moderator selection events for a conversation
 * Moderator selection events MUST be kind 7 (reaction)
 * These events E-tag the root and can have multiple e-tags for selected events
 */
function getModeratorSelections(
  events: NDKEvent[],
  rootEvent: NDKEvent | null,
): Set<string> {
  if (!rootEvent) return new Set();

  const selectedEventIds = new Set<string>();

  for (const event of events) {
    // Moderator selection events MUST be kind 7 (reaction events)
    if (event.kind !== 7) {
      continue;
    }

    // Check if this event E-tags the conversation root
    const rootETag = event.tagValue("E");

    if (rootETag === rootEvent.id) {
      // Get ALL lowercase e-tags which indicate selected events
      const eTags = event.getMatchingTags("e");
      for (const tag of eTags) {
        const selectedEventId = tag[1];
        if (selectedEventId && selectedEventId !== rootEvent.id) {
          // Don't add the root event ID - it's always shown
          // Only add actual selected reply events
          selectedEventIds.add(selectedEventId);
          console.log(`[Brainstorm] Found moderator selection event (kind:7) ${event.id} selecting ${selectedEventId}`);
        }
      }
    }
  }

  return selectedEventIds;
}

/**
 * Checks if an event should be shown in brainstorm mode
 * Shows: the root event, moderator selection events, and selected events
 */
function shouldShowInBrainstormMode(
  event: NDKEvent,
  rootEvent: NDKEvent | null,
  selectedEventIds: Set<string>,
  hasModeratorSelections: boolean,
  currentUserPubkey?: string,
): boolean {
  if (!rootEvent) return false; // In brainstorm mode, we need a root event

  // Always show the root event
  if (event.id === rootEvent.id) {
    return true;
  }

  // Always show messages from the current user (human)
  if (currentUserPubkey && event.pubkey === currentUserPubkey) {
    return true;
  }

  // Never show moderator selection events (kind 7) in the UI - they're just for filtering
  if (event.kind === 7) {
    return false;
  }

  // If no moderator selections exist yet, only show root event and current user messages
  if (!hasModeratorSelections) {
    return false;
  }

  // Only show events that have been explicitly selected by the moderator
  const isSelected = selectedEventIds.has(event.id);
  return isSelected;
}

/**
 * Processes all events into final messages with streaming session management
 */
export function processEventsToMessages(
  events: NDKEvent[],
  rootEvent: NDKEvent | null = null,
  viewMode: ThreadViewMode = 'threaded',
  isBrainstorm: boolean = false,
  showAll: boolean = false,
  currentUserPubkey?: string,
): Message[] {
  const finalMessages: Message[] = [];
  const streamingSessions = new Map<string, StreamingSession>();

  // Sort events chronologically
  const sortedEvents = sortEvents(events);

  // If rootEvent is not provided, try to find it in the events array
  // The root event is typically the one without an "e" tag or the earliest event
  if (!rootEvent && sortedEvents.length > 0) {
    // Look for an event that might be the root (no "e" tags, or specific kinds)
    rootEvent = sortedEvents.find(event => {
      // Check if this could be a root event (kind 11 for brainstorm)
      if (event.kind === 11) return true;
      // Or an event without "e" tags (not a reply)
      const eTags = event.getMatchingTags("e");
      return eTags.length === 0;
    }) || sortedEvents[0]; // Fallback to first event if no clear root found
  }

  // Get moderator selections if in brainstorm mode
  let selectedEventIds: Set<string> = new Set();
  if (isBrainstorm) {
    selectedEventIds = getModeratorSelections(sortedEvents, rootEvent);
  }
  const hasModeratorSelections = selectedEventIds.size > 0;

  // Process each event
  for (const event of sortedEvents) {
    // Handle brainstorm conversations
    if (isBrainstorm) {
      if (!showAll) {
        // Filter to only selected events when not showing all
        const shouldShow = shouldShowInBrainstormMode(event, rootEvent, selectedEventIds, hasModeratorSelections, currentUserPubkey);
        console.log(`[Brainstorm] Event ${event.id} kind:${event.kind} shouldShow:${shouldShow}`);
        if (!shouldShow) {
          // Also clean up any streaming session for this pubkey if it's not selected
          if (streamingSessions.has(event.pubkey)) {
            streamingSessions.delete(event.pubkey);
          }
          continue;
        }
      } else {
        // Show all: still hide kind:7 moderation events and streaming events
        if (event.kind === 7) {
          console.log(`[Brainstorm] Event ${event.id} is kind:7 - hiding even in show all mode`);
          continue;
        }
        if (event.kind === EVENT_KINDS.STREAMING_RESPONSE) {
          console.log(`[Brainstorm] Event ${event.id} is streaming - hiding even in show all mode`);
          continue;
        }
      }
      // Process the event directly in brainstorm mode
      processEvent(event, streamingSessions, finalMessages);
    } else {
      // Non-brainstorm mode: apply view mode filtering
      if (viewMode === 'flattened') {
        // In flattened mode, we already fetched the right events via the filters
        // Just process all of them chronologically
        processEvent(event, streamingSessions, finalMessages);
      } else {
        // Threaded mode: only include direct replies to the root event
        // Nested replies will still be accessible through their parent's reply count
        if (isDirectReplyToRoot(event, rootEvent)) {
          processEvent(event, streamingSessions, finalMessages);
        }
      }
    }
  }

  // Add active streaming sessions to final messages
  // In brainstorm mode, only add streaming sessions for selected events
  const streamingMessages = streamingSessionsToMessages(streamingSessions);
  if (isBrainstorm && !showAll) {
    // Filter streaming messages to only include those from selected events
    streamingMessages.forEach(msg => {
      if (shouldShowInBrainstormMode(msg.event, rootEvent, selectedEventIds, hasModeratorSelections, currentUserPubkey)) {
        finalMessages.push(msg);
      }
    });
  } else {
    finalMessages.push(...streamingMessages);
  }

  // Sort everything by timestamp (filter out messages without timestamps)
  const messagesWithTime = finalMessages
    .filter((msg) => msg.event.created_at !== undefined)
    .sort((a, b) => {
      const timeDiff = a.event.created_at - b.event.created_at;
      // If timestamps are equal, prioritize by tag type
      if (timeDiff === 0) {
        const aHasReasoning = a.event.hasTag("reasoning");
        const bHasReasoning = b.event.hasTag("reasoning");
        const aHasTool = a.event.hasTag("tool");
        const bHasTool = b.event.hasTag("tool");

        // Priority order: 1. reasoning, 2. tool, 3. others
        // Events with "reasoning" tag should come first
        if (aHasReasoning && !bHasReasoning) return -1;
        if (!aHasReasoning && bHasReasoning) return 1;

        // If neither or both have reasoning, check tool tags
        // Events with "tool" tag should come after reasoning but before others
        if (aHasTool && !bHasTool) return -1;
        if (!aHasTool && bHasTool) return 1;
      }
      return timeDiff;
    });

  return messagesWithTime;
}
