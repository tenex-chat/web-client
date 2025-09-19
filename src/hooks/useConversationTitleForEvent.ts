import { NDKEvent } from "@nostr-dev-kit/ndk";
import { useConversationMetadata } from "./useConversationMetadata";

export function useConversationTitleForEvent(event?: NDKEvent) {
  // Pass the event directly to useConversationMetadata
  // which already handles extracting the conversation ID from the 'E' tag
  const { title } = useConversationMetadata(event);

  return title;
}