import { useMemo } from "react";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { processEventsToMessages } from "@/components/chat/utils/messageProcessor";
import type { ThreadViewMode } from "@/stores/thread-view-mode-store";

/**
 * Generic hook for fetching an event and its direct replies
 * Handles streaming message processing and returns stable message objects
 */
export function useMessages(
  eventId: string | null,
  viewMode: ThreadViewMode = 'threaded'
) {
  // Subscribe to the event itself and its direct replies
  const { events } = useSubscribe(
    eventId
      ? [
          { ids: [eventId] },  // Get the event itself
          { "#e": [eventId] }  // Get direct replies to it
        ]
      : false,
    { closeOnEose: false, groupable: false },
    [eventId]
  );

  // Process events with streaming support
  const messages = useMemo(() => {
    return processEventsToMessages(events, null, viewMode);
  }, [events, viewMode]);

  return messages;
}