import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useConversationMetadataStore, ConversationMetadataResult } from "@/stores/conversationMetadataStore";
import { extractConversationId } from "@/utils/conversationMetadataProcessor";

/**
 * Hook to access conversation metadata for an event.
 * 
 * Why this design:
 * - Consolidates title and summary access into a single hook to reduce duplication
 * - Returns a consistent object structure that reduces null checks
 * - Uses the store's improved interface for better developer experience
 * 
 * @param event - The NDK event containing a conversation reference (e tag)
 * @returns ConversationMetadataResult with title, summary, and helper flags
 */
export const useConversationMetadata = (
  event: NDKEvent | undefined
): ConversationMetadataResult => {
  const conversationId = extractConversationId(event);
  const getConversationData = useConversationMetadataStore(
    state => state.getConversationData
  );
  
  return getConversationData(conversationId);
};