import { memo, useMemo, useCallback } from "react";
import { NDKEvent, NDKKind, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NostrProfile } from "@/components/common/NostrProfile";
import { Message } from "./Message";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { EVENT_KINDS } from "@/lib/constants";
import { processEventsToMessages } from "@/components/chat/utils/messageProcessor";
import { useAtomValue, useSetAtom } from "jotai";
import { expandedRepliesAtom, toggleRepliesAtom } from "./atoms/expandedReplies";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useThreadViewModeStore } from "@/stores/thread-view-mode-store";
import type { Message as MessageType } from "@/components/chat/hooks/useChatMessages";

interface ThreadedMessageProps {
  message: MessageType;
  depth: number;
  project?: NDKProject | null;
  onTimeClick?: (event: NDKEvent) => void;
  onConversationNavigate?: (event: NDKEvent) => void;
  processedEventIds: Set<string>;
  isConsecutive?: boolean;
  hasNextConsecutive?: boolean;
}

/**
 * Recursively renders a message and its reply thread
 * Handles subscriptions for replies and depth-based styling
 */
export const ThreadedMessage = memo(function ThreadedMessage({
  message,
  depth,
  project,
  onTimeClick,
  onConversationNavigate,
  processedEventIds,
  isConsecutive = false,
  hasNextConsecutive = false,
}: ThreadedMessageProps) {
  const isMobile = useIsMobile();
  const { mode: viewMode } = useThreadViewModeStore();
  const expandedReplies = useAtomValue(expandedRepliesAtom);
  const toggleReplies = useSetAtom(toggleRepliesAtom);

  // In flattened mode, everything is always expanded
  // In threaded mode, only expand if explicitly in the expanded set
  const isExpanded = viewMode === 'flattened' || expandedReplies.has(message.event.id);

  // Subscribe to direct replies
  const { events: replyEvents } = useSubscribe(
    message.event.kind === NDKKind.GenericReply
      ? [
          {
            kinds: [
              NDKKind.GenericReply,
              1934, // Task
              EVENT_KINDS.STREAMING_RESPONSE,
            ] as any,
            "#e": [message.event.id],
          },
        ]
      : false,
    {
      closeOnEose: false,
      groupable: true,
    },
    [message.event.id]
  );

  // Process replies
  const replies = useMemo(() => {
    if (!replyEvents || replyEvents.length === 0) {
      return [];
    }

    // Filter out root markers
    const filtered = replyEvents.filter((reply) => {
      const eTags = reply.tags?.filter((tag) => tag[0] === "e");
      const hasRootMarker = eTags?.some((tag) => tag[3] === "root");
      return !hasRootMarker;
    });

    return processEventsToMessages(filtered, null);
  }, [replyEvents]);

  const handleToggle = useCallback(() => {
    toggleReplies(message.event.id);
  }, [message.event.id, toggleReplies]);

  // Mark this event as processed
  const updatedProcessedIds = useMemo(() => {
    const newSet = new Set(processedEventIds);
    newSet.add(message.event.id);
    return newSet;
  }, [processedEventIds, message.event.id]);

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

                return (
                  <ThreadedMessage
                    key={reply.id}
                    message={reply}
                    depth={depth + 1}
                    project={project}
                    onTimeClick={onTimeClick}
                    onConversationNavigate={onConversationNavigate}
                    processedEventIds={updatedProcessedIds}
                    isConsecutive={isReplyConsecutive}
                    hasNextConsecutive={hasNextReplyConsecutive}
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