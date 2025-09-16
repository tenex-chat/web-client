import { useState, useEffect } from "react";
import { type NDKEvent, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
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
 */
export function useChatMessages(rootEvent: NDKEvent | null, viewMode: ThreadViewMode = 'threaded') {
  const [messages, setMessages] = useState<Message[]>([]);

  // Subscribe to thread messages using NIP-22 threading
  // This will include all message types: 1111, 1112, and other kinds
  const { events } = useSubscribe(
    rootEvent
      ? [{ ids: [rootEvent.id] }, rootEvent.filter(), rootEvent.nip22Filter()]
      : false,
    { closeOnEose: false, groupable: false, subId: "use-chat-messages" },
    [rootEvent?.id],
  );

  // Process thread replies into messages with streaming session management
  useEffect(() => {
    const processedMessages = processEventsToMessages(events, rootEvent, viewMode);
    setMessages(processedMessages);
  }, [events, rootEvent, viewMode]);

  return messages;
}
