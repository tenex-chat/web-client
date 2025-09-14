import { memo, useMemo, useCallback } from "react";
import { NDKEvent, NDKKind, useSubscribe, useNDK } from "@nostr-dev-kit/ndk-hooks";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NostrProfile } from "@/components/common/NostrProfile";
import { Message } from "./Message";
import { TaskContent } from "./TaskContent";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { EVENT_KINDS } from "@/lib/constants";
import { processEventsToMessages } from "@/components/chat/utils/messageProcessor";
import { useAtomValue, useSetAtom } from "jotai";
import { expandedRepliesAtom, toggleRepliesAtom } from "./atoms/expandedReplies";
import { useIsMobile } from "@/hooks/useMediaQuery";

interface MessageThreadProps {
  parentEvent: NDKEvent;
  project?: NDKProject | null;
  depth?: number;
  onReply?: (event: NDKEvent) => void;
  onTimeClick?: (event: NDKEvent) => void;
  onConversationNavigate?: (event: NDKEvent) => void;
  mainThreadEventIds?: Set<string>; // IDs of events already shown in main thread
}

/**
 * Component responsible for fetching and displaying message replies
 * Handles subscription, threading, and recursive rendering
 */
export const MessageThread = memo(function MessageThread({
  parentEvent,
  project,
  depth = 0,
  onReply,
  onTimeClick,
  onConversationNavigate,
  mainThreadEventIds,
}: MessageThreadProps) {
  const { ndk } = useNDK();
  const isMobile = useIsMobile();
  const expandedReplies = useAtomValue(expandedRepliesAtom);
  const toggleReplies = useSetAtom(toggleRepliesAtom);
  const showReplies = expandedReplies.has(parentEvent.id);

  // Subscribe to replies (don't subscribe for kind 11 events)
  const { events: directReplies } = useSubscribe(
    parentEvent.kind === NDKKind.GenericReply
      ? [
          {
            kinds: [
              NDKKind.GenericReply,
              1934,
              EVENT_KINDS.STREAMING_RESPONSE,
            ] as any,
            "#e": [parentEvent.id],
          },
        ]
      : false,
    {
      closeOnEose: false,
      groupable: true,
    },
    [parentEvent.id]
  );

  // Process replies into messages
  const replyMessages = useMemo(() => {
    if (!directReplies || directReplies.length === 0) return [];

    // Filter out replies with root marker and those already in main thread
    const filtered = directReplies.filter((reply) => {
      // Skip if this reply is already shown in the main thread
      if (mainThreadEventIds && mainThreadEventIds.has(reply.id)) {
        return false;
      }

      const eTags = reply.tags?.filter((tag) => tag[0] === "e");
      const hasRootMarker = eTags?.some((tag) => tag[3] === "root");
      return !hasRootMarker;
    });

    return processEventsToMessages(filtered, null);
  }, [directReplies, mainThreadEventIds]);

  const replyCount = replyMessages.length;

  const handleToggle = useCallback(() => {
    toggleReplies(parentEvent.id);
  }, [parentEvent.id, toggleReplies]);

  // Don't render anything if no replies
  if (replyCount === 0) return null;

  return (
    <>
      {/* Reply count toggle button */}
      <div className="mt-1.5">
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2 py-1 rounded"
        >
          <div className="flex -space-x-1.5">
            {replyMessages.slice(0, 20).map((message, idx) => (
              <div key={message.id} style={{ zIndex: 20 - idx }}>
                <NostrProfile
                  pubkey={message.event.pubkey}
                  variant="avatar"
                  className="w-5 h-5 border-2 border-background rounded"
                />
              </div>
            ))}
            {replyMessages.length > 20 && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                +{replyMessages.length - 20}
              </span>
            )}
          </div>
          <span>
            {replyCount} {replyCount === 1 ? "reply" : "replies"}
          </span>
          {showReplies ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
        </button>
      </div>

      {/* Thread replies */}
      {showReplies && (
        <div
          className={cn(
            "border-l-2 border-muted mt-2",
            isMobile ? "ml-3" : "ml-[48px]"
          )}
        >
          {replyMessages.map((message, index) => {
            // Special handling for task events
            if (message.event.kind === 1934) {
              const task = ndk
                ? new NDKTask(ndk, message.event.rawEvent())
                : null;
              if (!task) return null;
              return (
                <div key={message.id} className="ml-3 mt-2">
                  <TaskContent
                    task={task}
                    onClick={() => onTimeClick?.(message.event)}
                  />
                </div>
              );
            }

            // Check if this message is consecutive (from same author as previous message)
            const isConsecutive =
              index > 0 &&
              replyMessages[index - 1].event.pubkey === message.event.pubkey &&
              replyMessages[index - 1].event.kind !== 1934 && // Previous wasn't a task
              message.event.kind !== 1934; // Current isn't a task

            // Regular message with potential nested replies
            return (
              <div key={message.id}>
                <Message
                  event={message.event}
                  project={project}
                  onReply={onReply}
                  isNested={true}
                  onTimeClick={onTimeClick}
                  onConversationNavigate={onConversationNavigate}
                  isConsecutive={isConsecutive}
                />
                {/* Recursively render thread for this reply */}
                <MessageThread
                  parentEvent={message.event}
                  project={project}
                  depth={depth + 1}
                  onReply={onReply}
                  onTimeClick={onTimeClick}
                  onConversationNavigate={onConversationNavigate}
                  mainThreadEventIds={mainThreadEventIds}
                />
              </div>
            );
          })}
        </div>
      )}
    </>
  );
});