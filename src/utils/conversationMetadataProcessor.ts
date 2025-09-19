import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

/**
 * Result of processing a kind 513 event for conversation metadata.
 * Includes either successful data or error information for proper error propagation.
 */
export type ProcessedMetadataResult = 
  | { success: true; conversationId: string; title?: MetadataField; summary?: MetadataField }
  | { success: false; error: string; eventId?: string };

/**
 * Represents a metadata field with its value and timestamp.
 * Used for cumulative updates where newer timestamps override older ones.
 */
export interface MetadataField {
  value: string;
  timestamp: number;
}

/**
 * Extracts the conversation ID from an event's 'E' tag.
 * 
 * Why: Per NIP-22, conversation root events are referenced using uppercase 'E' tags.
 * This distinguishes them from regular event references (lowercase 'e').
 * The uppercase 'E' tag marks the root/parent conversation that this event belongs to.
 * 
 * @param event - The NDK event to extract conversation ID from
 * @returns The conversation ID if found, undefined otherwise
 */
export function extractConversationId(
  event: NDKEvent | undefined
): string | undefined {
  if (!event || !event.tags) return undefined;

  // Use uppercase 'E' tag for root conversation events (NIP-22)
  const conversationIdTag = event.tags.find(tag => tag[0] === "E");
  return conversationIdTag ? conversationIdTag[1] : undefined;
}

/**
 * Processes a kind 513 event to extract conversation metadata.
 * 
 * Why: This function encapsulates all the complex logic for extracting and validating
 * metadata from events, keeping the listener component focused on subscription management.
 * The cumulative nature of kind 513 events means we need to track timestamps to ensure
 * only newer data overwrites older data.
 * 
 * kind:513 events have empty content and store metadata in tags:
 * - "e"-tags (lowercase) reference the conversation event
 * - "title" tags store the conversation title
 * - "summary" tags store the conversation summary
 * 
 * @param event - The kind 513 event to process
 * @param currentMetadata - Current metadata for comparison (optional)
 * @returns ProcessedMetadataResult with either extracted metadata or error information
 */
export function processConversationMetadataEvent(
  event: NDKEvent,
  currentMetadata?: { title?: MetadataField; summary?: MetadataField }
): ProcessedMetadataResult {
  // Find the "e" tag to get the conversation ID
  const eTag = event.tags?.find(tag => tag[0] === "e");
  const conversationId = eTag ? eTag[1] : undefined;
  if (!conversationId) {
    return {
      success: false,
      error: "Missing required conversation ID (e tag)",
      eventId: event.id
    };
  }

  const eventTimestamp = event.created_at;
  
  // Validate timestamp exists
  if (!eventTimestamp && eventTimestamp !== 0) {
    return {
      success: false,
      error: "Missing created_at timestamp",
      eventId: event.id
    };
  }

  let titleToUpdate: MetadataField | undefined;
  let summaryToUpdate: MetadataField | undefined;

  // Extract title from 'title' tag if present
  const titleTag = event.tags.find(tag => tag[0] === "title");
  // Accept any string value, including empty strings
  if (titleTag && typeof titleTag[1] === "string") {
    // Only include if newer than existing (cumulative update logic)
    if (!currentMetadata?.title || eventTimestamp > currentMetadata.title.timestamp) {
      titleToUpdate = { value: titleTag[1], timestamp: eventTimestamp };
    }
  }

  // Extract summary from 'summary' tag if present
  const summaryTag = event.tags.find(tag => tag[0] === "summary");
  // Accept any string value, including empty strings
  if (summaryTag && typeof summaryTag[1] === "string") {
    // Only include if newer than existing (cumulative update logic)
    if (!currentMetadata?.summary || eventTimestamp > currentMetadata.summary.timestamp) {
      summaryToUpdate = { value: summaryTag[1], timestamp: eventTimestamp };
    }
  }

  // Return successful result only if we have at least one update
  if (titleToUpdate || summaryToUpdate) {
    return {
      success: true,
      conversationId,
      title: titleToUpdate,
      summary: summaryToUpdate
    };
  }

  // No updates needed (existing data is newer)
  return {
    success: true,
    conversationId,
    // Return undefined for both to indicate no update needed
    title: undefined,
    summary: undefined
  };
}