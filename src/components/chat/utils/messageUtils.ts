import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { EVENT_KINDS } from "@/lib/constants";
import type { Message } from "@/components/chat/hooks/useChatMessages";

/**
 * Check if two messages should be displayed as consecutive (from same author, no interruptions)
 */
export function isConsecutiveMessage(
  previousMessage: Message | undefined,
  currentMessage: Message
): boolean {
  if (!previousMessage) return false;
  
  return (
    previousMessage.event.pubkey === currentMessage.event.pubkey &&
    previousMessage.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
    currentMessage.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
    !currentMessage.event.tags?.some(tag => tag[0] === 'p') &&
    !previousMessage.event.tags?.some(tag => tag[0] === 'p')
  );
}

/**
 * Check if the next message will be consecutive to this one
 */
export function hasNextConsecutiveMessage(
  currentMessage: Message,
  nextMessage: Message | undefined
): boolean {
  if (!nextMessage) return false;
  
  return (
    nextMessage.event.pubkey === currentMessage.event.pubkey &&
    nextMessage.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
    currentMessage.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
    !nextMessage.event.tags?.some(tag => tag[0] === 'p') &&
    !currentMessage.event.tags?.some(tag => tag[0] === 'p')
  );
}

/**
 * Find the index of the last message with a reasoning tag
 */
export function findLastReasoningIndex(messages: Message[]): number {
  return messages.findLastIndex(msg => msg.event.hasTag?.("reasoning"));
}

/**
 * Calculate message display properties for a list of messages
 */
export function calculateMessageProperties(messages: Message[]) {
  const lastReasoningIndex = findLastReasoningIndex(messages);
  
  return messages.map((msg, index) => ({
    message: msg,
    isConsecutive: isConsecutiveMessage(messages[index - 1], msg),
    hasNextConsecutive: hasNextConsecutiveMessage(msg, messages[index + 1]),
    isLastReasoningMessage: index === lastReasoningIndex
  }));
}