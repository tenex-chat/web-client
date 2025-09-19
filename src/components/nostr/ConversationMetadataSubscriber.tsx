import { useEffect, useCallback } from "react";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useConversationMetadataStore } from "@/stores/conversationMetadataStore";
import { processConversationMetadataEvent } from "@/utils/conversationMetadataProcessor";

/**
 * Global subscriber component for kind 513 conversation metadata events.
 * 
 * Why this component exists:
 * - Maintains a global subscription to all kind 513 events for real-time updates
 * - Delegates complex processing logic to utilities for better testability
 * - Keeps the store "dumb" by handling business logic here
 * 
 * This component follows Single Responsibility Principle by focusing only on:
 * 1. Managing the NDK subscription
 * 2. Coordinating between the processor and store
 */
const ConversationMetadataSubscriber = () => {
  const { setMetadata, getMetadata } = useConversationMetadataStore();
  
  // Subscribe to all kind 513 events
  const { events } = useSubscribe(
    [{ kinds: [513 as NDKKind] }],
    { 
      closeOnEose: false, // Keep subscription open for real-time updates
      groupable: true 
    }
  );

  /**
   * Handles a single kind 513 event.
   * Extracted as a callback to avoid recreating on every render.
   */
  const handleEvent = useCallback((event: NDKEvent) => {
    // Get current metadata for timestamp comparison (uppercase 'E' per NIP-22)
    const conversationId = event.tags.find(tag => tag[0] === "E")?.[1];
    const currentMetadata = conversationId ? getMetadata(conversationId) : undefined;
    
    // Process the event using our extracted logic
    const result = processConversationMetadataEvent(event, currentMetadata);
    
    if (result.success) {
      // Only update if we have new data
      if (result.title || result.summary) {
        setMetadata(result.conversationId, {
          title: result.title,
          summary: result.summary
        });
      }
    } else {
      // Log errors for monitoring but don't crash the app
      // In production, this could be sent to an error tracking service
      console.error(
        `Failed to process kind 513 event: ${result.error}`,
        { eventId: result.eventId }
      );
    }
  }, [setMetadata, getMetadata]);

  useEffect(() => {
    if (!events || events.length === 0) return;
    
    // Process each event
    events.forEach(handleEvent);
  }, [events, handleEvent]);

  return null; // Non-rendering component
};

export default ConversationMetadataSubscriber;