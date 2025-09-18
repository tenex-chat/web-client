import { memo, useCallback } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NostrProfile } from "@/components/common/NostrProfile";
import { Message } from "./Message";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { EVENT_KINDS } from "@/lib/constants";
import { useAtomValue, useSetAtom } from "jotai";
import { expandedRepliesAtom, toggleRepliesAtom } from "./atoms/expandedReplies";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useThreadViewModeStore } from "@/stores/thread-view-mode-store";
import { useMessages } from "./hooks/useMessages";
import type { Message as MessageType } from "@/components/chat/hooks/useChatMessages";

interface ThreadedMessageProps {
  eventId?: string;
  message?: MessageType;
  depth: number;
  project?: NDKProject | null;
  onTimeClick?: (event: NDKEvent) => void;
  onConversationNavigate?: (event: NDKEvent) => void;
  isConsecutive?: boolean;
  hasNextConsecutive?: boolean;
  isFirstInRoot?: boolean; // Is this the first message at root level
  isLastReasoningMessage?: boolean; // Is this the last message with reasoning
}

/**
 * Recursively renders a message and its reply thread
 * Handles subscriptions for replies and depth-based styling
 */
export const ThreadedMessage = memo(function ThreadedMessage({
  eventId,
  message,
  depth,
  project,
  onTimeClick,
  onConversationNavigate,
  isConsecutive = false,
  hasNextConsecutive = false,
  isFirstInRoot = false,
  isLastReasoningMessage = false,
}: ThreadedMessageProps) {
  const isMobile = useIsMobile();
  const { mode: viewMode } = useThreadViewModeStore();
  const expandedReplies = useAtomValue(expandedRepliesAtom);
  const toggleReplies = useSetAtom(toggleRepliesAtom);

  // Use the hook to get messages for this event
  const messages = useMessages(eventId || message?.event.id || null, viewMode);

  // If we're rendering by eventId (root level), render all messages
  if (eventId && depth === 0) {
    // Find the last message that has a reasoning tag
    const lastReasoningMessageIndex = messages.findLastIndex(
      msg => msg.event.hasTag?.("reasoning")
    );
    
    // In flattened mode, render all messages directly without recursion
    if (viewMode === 'flattened') {
      return (
        <>
          {messages.map((msg, index) => {
            // Calculate consecutive status
            const isConsec =
              index > 0 &&
              messages[index - 1].event.pubkey === msg.event.pubkey &&
              messages[index - 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
              msg.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
              !msg.event.tags?.some(tag => tag[0] === 'p') &&
              !messages[index - 1].event.tags?.some(tag => tag[0] === 'p');

            const hasNextConsec =
              index < messages.length - 1 &&
              messages[index + 1].event.pubkey === msg.event.pubkey &&
              messages[index + 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
              msg.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
              !messages[index + 1].event.tags?.some(tag => tag[0] === 'p') &&
              !msg.event.tags?.some(tag => tag[0] === 'p');
              
            // Check if this message has reasoning and is the last one with reasoning
            const isLastReasoningMessage = index === lastReasoningMessageIndex;

            // In flattened mode, render directly without recursion
            return (
              <Message
                key={msg.id}
                event={msg.event}
                project={project}
                isConsecutive={isConsec}
                hasNextConsecutive={hasNextConsec}
                isNested={false}
                onTimeClick={onTimeClick}
                onConversationNavigate={onConversationNavigate}
                message={msg}
                isLastMessage={isLastReasoningMessage}
              />
            );
          })}
        </>
      );
    }
    
    // Threaded mode: render with recursion
    return (
      <>
        {messages.map((msg, index) => {
          // Calculate consecutive status
          const isConsec =
            index > 0 &&
            messages[index - 1].event.pubkey === msg.event.pubkey &&
            messages[index - 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
            msg.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
            !msg.event.tags?.some(tag => tag[0] === 'p') &&
            !messages[index - 1].event.tags?.some(tag => tag[0] === 'p');

          const hasNextConsec =
            index < messages.length - 1 &&
            messages[index + 1].event.pubkey === msg.event.pubkey &&
            messages[index + 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
            msg.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
            !messages[index + 1].event.tags?.some(tag => tag[0] === 'p') &&
            !msg.event.tags?.some(tag => tag[0] === 'p');
            
          // Check if this message has reasoning and is the last one with reasoning
          const isLastReasoningMessage = index === lastReasoningMessageIndex;

          return (
            <ThreadedMessage
              key={msg.id}
              message={msg}
              depth={1}
              project={project}
              onTimeClick={onTimeClick}
              onConversationNavigate={onConversationNavigate}
              isConsecutive={isConsec}
              hasNextConsecutive={hasNextConsec}
              isFirstInRoot={index === 0} // Mark the first message
              isLastReasoningMessage={isLastReasoningMessage}
            />
          );
        })}
      </>
    );
  }

  // In flattened mode, everything is always expanded
  // In threaded mode, only expand if explicitly in the expanded set
  const isExpanded = viewMode === 'flattened' || expandedReplies.has(message?.event.id || '');

  // Get replies for this message using the same hook
  // Filter to exclude the message itself from its own replies
  // Skip replies if this is the first message at root level (they're already displayed)
  const replies = isFirstInRoot ? [] : messages.filter(msg => msg.event.id !== message?.event.id);

  const handleToggle = useCallback(() => {
    if (message) {
      toggleReplies(message.event.id);
    }
  }, [message?.event.id, toggleReplies]);

  // Single message handling (depth > 0)
  if (!message) return null;

  return (
    <div>
      {/* Render the message itself */}
      <Message
        event={message.event}
        project={project}
        isConsecutive={isConsecutive}
        hasNextConsecutive={hasNextConsecutive}
        isNested={depth > 0}
        onTimeClick={onTimeClick}
        onConversationNavigate={onConversationNavigate}
        message={message}
        isLastMessage={isLastReasoningMessage}
      />

      {/* Render replies */}
      {replies.length > 0 && (
        <>
          {/* Toggle button for replies (only in threaded mode) */}
          {viewMode === 'threaded' && (
            <div className={cn(
              isMobile ? "ml-9" : "ml-12",
              "mt-1.5 relative"
            )}>
              <button
                type="button"
                onClick={handleToggle}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2 py-1 rounded"
              >
                <div className="flex -space-x-1.5">
                  {replies.slice(0, 20).map((reply, idx) => (
                    <div key={reply.id} style={{ zIndex: 20 - idx }}>
                      <NostrProfile
                        pubkey={reply.event.pubkey}
                        variant="avatar"
                        className="w-5 h-5 border-2 border-background rounded"
                      />
                    </div>
                  ))}
                  {replies.length > 20 && (
                    <span className="ml-1 text-[10px] text-muted-foreground">
                      +{replies.length - 20}
                    </span>
                  )}
                </div>
                <span>
                  {replies.length} {replies.length === 1 ? "reply" : "replies"}
                </span>
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            </div>
          )}

          {/* Render reply messages */}
          {isExpanded && (
            <div className={cn(isMobile ? "ml-9" : "ml-12", "mt-2")}>
              {replies.map((reply, index) => {
                // Calculate consecutive status
                const isReplyConsecutive =
                  index > 0 &&
                  replies[index - 1].event.pubkey === reply.event.pubkey &&
                  replies[index - 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
                  reply.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
                  !reply.event.tags?.some(tag => tag[0] === 'p') &&
                  !replies[index - 1].event.tags?.some(tag => tag[0] === 'p');

                const hasNextReplyConsecutive =
                  index < replies.length - 1 &&
                  replies[index + 1].event.pubkey === reply.event.pubkey &&
                  replies[index + 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
                  reply.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
                  !replies[index + 1].event.tags?.some(tag => tag[0] === 'p') &&
                  !reply.event.tags?.some(tag => tag[0] === 'p');
                  
                // Find the last message with reasoning in replies
                const lastReasoningReplyIndex = replies.findLastIndex(
                  r => r.event.hasTag?.("reasoning")
                );
                const isLastReasoningReply = index === lastReasoningReplyIndex;

                return (
                  <ThreadedMessage
                    key={reply.id}
                    message={reply}
                    depth={depth + 1}
                    project={project}
                    onTimeClick={onTimeClick}
                    onConversationNavigate={onConversationNavigate}
                    isConsecutive={isReplyConsecutive}
                    hasNextConsecutive={hasNextReplyConsecutive}
                    isLastReasoningMessage={isLastReasoningReply}
                  />
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
});