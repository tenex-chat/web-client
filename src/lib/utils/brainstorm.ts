import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

/**
 * Check if an event is a brainstorm mode message
 */
export function isBrainstormMessage(event: NDKEvent): boolean {
  return event.tags.some(tag => tag[0] === "mode" && tag[1] === "brainstorm") ||
         event.tags.some(tag => tag[0] === "t" && tag[1] === "brainstorm");
}

/**
 * Get the actual message content from an event
 * For brainstorm messages, the content is not encoded - it's just plain text
 */
export function getMessageContent(event: NDKEvent): string {
  return event.content;
}

/**
 * Get the moderator pubkey from a brainstorm event
 * In brainstorm mode, the moderator is the only p-tag
 */
export function getBrainstormModerator(event: NDKEvent): string | null {
  if (!isBrainstormMessage(event)) return null;
  const pTag = event.tags.find(tag => tag[0] === "p");
  return pTag?.[1] || null;
}

/**
 * Get the participant pubkeys from a brainstorm event
 * Participants are stored as ["participant", "<pubkey>"] tags
 */
export function getBrainstormParticipants(event: NDKEvent): string[] {
  if (!isBrainstormMessage(event)) return [];
  return event.tags
    .filter(tag => tag[0] === "participant" && tag[1])
    .map(tag => tag[1]);
}