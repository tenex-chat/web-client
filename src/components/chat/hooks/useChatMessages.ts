import { useState, useEffect } from "react";
import { type NDKEvent, useSubscribe, useNDKCurrentPubkey } from "@nostr-dev-kit/ndk-hooks";
import { processEventsToMessages } from "@/components/chat/utils/messageProcessor";
import { type ThreadViewMode } from "@/stores/thread-view-mode-store";

export interface Message {
  id: string; // Either event.id or synthetic ID for streaming sessions
  event: NDKEvent;
  isReactComponent?: boolean;
  reactComponentCode?: string;
  reactComponentProps?: Record<string, any>;
}

/**
 * Hook for managing chat messages including streaming sessions
 * Handles event subscription, streaming processing, and message sorting
 *
 * @param rootEvent - The root conversation event
 * @param viewMode - Threading mode (threaded or flattened)
 * @param isBrainstorm - Whether this is a brainstorm conversation
 * @param showAll - For brainstorm: whether to show all messages or just selected ones
 */
export function useChatMessages(
  rootEvent: NDKEvent | null,
  viewMode: ThreadViewMode = 'threaded',
  isBrainstorm: boolean = false,
  showAll: boolean = false
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const currentUserPubkey = useNDKCurrentPubkey();

  // Subscribe to thread messages using NIP-22 threading
  // For brainstorm conversations: only kinds 1111 (replies) and 7 (moderation selections)
  // For regular conversations: all message types
  const filters = rootEvent
    ? isBrainstorm
      ? [
          { kinds: [1111, 7], ...rootEvent.filter() },
          { kinds: [1111, 7], ...rootEvent.nip22Filter() }
        ]
      : [
          rootEvent.filter(),
          rootEvent.nip22Filter()
        ]
    : false;

  const { events } = useSubscribe(
    filters,
    { closeOnEose: false, groupable: false, subId: isBrainstorm ? "brainstorm" : "use-chat-messages" },
    [rootEvent?.id, isBrainstorm],
  );

  // Process thread replies into messages with streaming session management
  useEffect(() => {
    const processedMessages = processEventsToMessages(
      events,
      rootEvent,
      viewMode,
      isBrainstorm,
      showAll,
      currentUserPubkey
    );

    // Use a more efficient comparison that checks message IDs and content
    setMessages((prevMessages) => {
      // Quick length check first
      if (prevMessages.length !== processedMessages.length) {
        return processedMessages;
      }

      // Check if any message has changed by comparing IDs and content
      const hasChanged = processedMessages.some((msg, index) => {
        const prevMsg = prevMessages[index];
        return !prevMsg ||
               prevMsg.id !== msg.id ||
               prevMsg.event.content !== msg.event.content ||
               prevMsg.event.created_at !== msg.event.created_at;
      });

      if (hasChanged) {
        return processedMessages;
      }

      return prevMessages; // Return the same reference to prevent re-renders
    });
  }, [events, rootEvent, viewMode, isBrainstorm, showAll, currentUserPubkey]);

  return messages;
}
