import { useMemo } from "react";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { processEventsToMessages } from "@/components/chat/utils/messageProcessor";
import type { ThreadViewMode } from "@/stores/thread-view-mode-store";

/**
 * Generic hook for fetching an event and its replies
 * Handles streaming message processing and returns stable message objects
 * In flattened mode, fetches ALL events in the conversation hierarchy
 * In threaded mode, fetches only direct replies
 */
export function useMessages(
  eventId: string | null,
  viewMode: ThreadViewMode = 'threaded'
) {
  // Subscribe based on view mode
  const { events } = useSubscribe(
    eventId
      ? viewMode === 'flattened'
        ? [ { ids: [eventId] },       // Get the conversation event itself
            { "#E": [eventId] },      // Get ALL events that reference this conversation (uppercase E)
            { "#e": [eventId] }       // Also include direct replies (lowercase e) for completeness
          ]
        : [
            { ids: [eventId] },       // Get the event itself
            { "#e": [eventId] }       // Get only direct replies to it (threaded mode)
          ]
      : false,
    { closeOnEose: false, groupable: false },
    [eventId, viewMode]
  );

  // Process events with streaming support
  const messages = useMemo(() => {
    return processEventsToMessages(events, null, viewMode);
  }, [events, viewMode]);

  return messages;
}