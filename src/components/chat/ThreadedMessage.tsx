import { memo, useCallback, useMemo } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { NostrProfile } from "@/components/common/NostrProfile";
import { Message } from "./Message";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { useAtomValue, useSetAtom } from "jotai";
import { expandedRepliesAtom, toggleRepliesAtom } from "./atoms/expandedReplies";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { useChatMessages } from "./hooks/useChatMessages";
import type { Message as MessageType } from "@/components/chat/hooks/useChatMessages";
import { NDKEvent as NDKEventType } from "@nostr-dev-kit/ndk-hooks";
import { isBrainstormMessage } from "@/lib/utils/brainstorm";
import { useBrainstormView } from "@/stores/brainstorm-view-store";
import { calculateMessageProperties } from "./utils/messageUtils";

interface ThreadedMessageProps {
  eventId?: string;
  message?: MessageType;
  rootEvent: NDKEventType;
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
  rootEvent,
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
  const expandedReplies = useAtomValue(expandedRepliesAtom);
  const toggleReplies = useSetAtom(toggleRepliesAtom);

  // Removed debug logging

  // Check if this is a brainstorm conversation
  const isBrainstormConversation = rootEvent && isBrainstormMessage(rootEvent);
  const { showNotChosen } = useBrainstormView();

  // Determine which event we're working with
  // At depth 0 with eventId, we're rendering the root
  // Otherwise we have a message to render
  const currentEvent = eventId && depth === 0 ? rootEvent : message?.event;
  if (!currentEvent) return null;

  // Create a Message object for the current event if we don't have one
  const currentMessage: MessageType = message || { id: currentEvent.id, event: currentEvent };

  // Get direct replies to this event
  const replies = useChatMessages(
    currentEvent,
    'threaded', // Always threaded mode in this component
    isBrainstormConversation,
    isBrainstormConversation ? showNotChosen : false
  );

  // Calculate properties for replies - must be called unconditionally for hooks consistency
  const replyProperties = useMemo(
    () => calculateMessageProperties(replies),
    [replies]
  );

  // For nested messages (depth > 0), handle expansion state - must be called unconditionally
  const isExpanded = expandedReplies.has(currentEvent.id);

  const handleToggle = useCallback(() => {
    toggleReplies(currentEvent.id);
  }, [currentEvent.id, toggleReplies]);

  // At root level, render the root event and its direct replies
  if (depth === 0) {

    return (
      <>
        {/* Render the root event itself */}
        <Message
          event={currentEvent}
          project={project}
          isConsecutive={false}
          hasNextConsecutive={replies.length > 0}
          isNested={false}
          onTimeClick={onTimeClick}
          onConversationNavigate={onConversationNavigate}
          message={currentMessage}
          isLastMessage={replies.length === 0 && currentEvent.hasTag?.("reasoning")}
        />

        {/* Render direct replies recursively */}
        {replyProperties.map(({ message, isConsecutive, hasNextConsecutive, isLastReasoningMessage }) => (
          <ThreadedMessage
            key={message.id}
            message={message}
            rootEvent={rootEvent}
            depth={1}
            project={project}
            onTimeClick={onTimeClick}
            onConversationNavigate={onConversationNavigate}
            isConsecutive={isConsecutive}
            hasNextConsecutive={hasNextConsecutive}
            isLastReasoningMessage={isLastReasoningMessage}
          />
        ))}
      </>
    );
  }

  // For nested messages (depth > 0)
  return (
			<>
				{/* Render the current event */}
				<Message
					event={currentEvent}
					project={project}
					isConsecutive={isConsecutive}
					hasNextConsecutive={hasNextConsecutive}
					isNested={depth > 0}
					onTimeClick={onTimeClick}
					onConversationNavigate={onConversationNavigate}
					message={message || { id: currentEvent.id, event: currentEvent }}
					isLastMessage={isLastReasoningMessage}
				/>

				{/* Render replies */}
				{replies.length > 0 && (
					<>
						{/* Toggle button for replies */}
						<div
							className={cn(isMobile ? "ml-9" : "ml-12", "mt-1.5 relative")}
						>
							<button
									type="button"
									onClick={handleToggle}
									className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2 py-1 rounded"
								>
									<div className="flex -space-x-1.5">
										{/* Get unique pubkeys from replies to avoid showing duplicates */}
										{[...new Set(replies.map((r) => r.event.pubkey))]
											.slice(0, 20)
											.map((pubkey, idx) => (
												<div key={pubkey} style={{ zIndex: 20 - idx }}>
													<NostrProfile
														pubkey={pubkey}
														variant="avatar"
														className="w-5 h-5 border-2 border-background rounded"
													/>
												</div>
											))}
										{[...new Set(replies.map((r) => r.event.pubkey))].length >
											20 && (
											<span className="ml-1 text-[10px] text-muted-foreground">
												+
												{[...new Set(replies.map((r) => r.event.pubkey))]
													.length - 20}
											</span>
										)}
									</div>
									<span>
										{replies.length}{" "}
										{replies.length === 1 ? "reply" : "replies"}
									</span>
									{isExpanded ? (
										<ChevronDown className="w-3 h-3" />
									) : (
										<ChevronRight className="w-3 h-3" />
									)}
								</button>
						</div>

						{/* Render reply messages */}
						{isExpanded && (
							<div className={cn(isMobile ? "ml-9" : "ml-12", "mt-2")}>
								{replyProperties.map(
									({ message, isConsecutive, hasNextConsecutive, isLastReasoningMessage }) => (
										<ThreadedMessage
											key={message.id}
											message={message}
											rootEvent={rootEvent}
											depth={depth + 1}
											project={project}
											onTimeClick={onTimeClick}
											onConversationNavigate={onConversationNavigate}
											isConsecutive={isConsecutive}
											hasNextConsecutive={hasNextConsecutive}
											isLastReasoningMessage={isLastReasoningMessage}
										/>
									)
								)}
							</div>
						)}
					</>
				)}
			</>
		);
});