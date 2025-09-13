import {
  NDKEvent,
  NDKKind,
  useSubscribe,
  useNDK,
} from "@nostr-dev-kit/ndk-hooks";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TypingIndicator } from "./TypingIndicator";
import { StreamingCaret } from "./StreamingCaret";
import { AIReasoningBlock } from "./AIReasoningBlock";
import { memo, useCallback, useMemo, useState } from "react";
import { useReply } from "./contexts/ReplyContext";
import { processEventsToMessages } from "@/components/chat/utils/messageProcessor";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useMarkdownComponents } from "@/lib/markdown/config";
import { cn } from "@/lib/utils";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { EVENT_KINDS } from "@/lib/constants";
import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { LLMMetadataDialog } from "@/components/dialogs/LLMMetadataDialog";
import { NostrProfile } from "@/components/common/NostrProfile";
import { Link } from "@tanstack/react-router";
import {
  extractLLMMetadata,
  getEventPhase,
  getEventPhaseFrom,
} from "@/lib/utils/event-metadata";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { getUserStatus } from "@/lib/utils/userStatus";
import { useAtomValue, useSetAtom } from "jotai";
import {
  hoveredMessageIdAtom,
  hoveredMessageStackAtom,
} from "./atoms/hoveredMessage";
import { TaskContent } from "./TaskContent";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { MessageHeaderContent } from "./MessageHeaderContent";
import { MessageActionsToolbar } from "./MessageActionsToolbar";
import { ToolCallContent } from "./ToolCallContent";

interface MessageWithRepliesProps {
  event: NDKEvent;
  project?: NDKProject | null;
  onReply?: (event: NDKEvent) => void;
  isNested?: boolean;
  onTimeClick?: (event: NDKEvent) => void;
  onConversationNavigate?: (event: NDKEvent) => void;
  isConsecutive?: boolean;
}

export const MessageWithReplies = memo(function MessageWithReplies({
  event,
  project,
  onReply,
  isNested = false,
  onTimeClick,
  onConversationNavigate,
  isConsecutive = false,
}: MessageWithRepliesProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const [showReplies, setShowReplies] = useState(false);
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);
  const { replyingTo, setReplyingTo } = useReply();
  const [, setLightboxImage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const hoveredMessageId = useAtomValue(hoveredMessageIdAtom);
  const setHoveredStack = useSetAtom(hoveredMessageStackAtom);
  const isMobile = useIsMobile();

  const isHovered = hoveredMessageId === event.id;
  const isBeingRepliedTo = replyingTo?.id === event.id;

  const handleMouseEnter = useCallback(() => {
    if (!isMobile) {
      setHoveredStack((stack) => [
        ...stack.filter((id) => id !== event.id),
        event.id,
      ]);
    }
  }, [event.id, setHoveredStack, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (!isMobile) {
      setHoveredStack((stack) => stack.filter((id) => id !== event.id));
    }
  }, [event.id, setHoveredStack, isMobile]);

  // Get user status (external or belonging to another project)
  const userStatus = useMemo(() => {
    return getUserStatus(event.pubkey, user?.pubkey, project?.dTag || "");
  }, [event.pubkey, user?.pubkey, project?.dTag]);

  // Extract p-tags (recipients) from the event
  const recipientPubkeys = useMemo(() => {
    if (!event.tags) return [];
    return event.tags
      .filter((tag) => tag[0] === "p" && tag[1])
      .map((tag) => tag[1])
      .filter((pubkey, index, self) => self.indexOf(pubkey) === index); // Remove duplicates
  }, [event.tags]);

  // Markdown configuration
  const markdownComponents = useMarkdownComponents({
    isMobile,
    onImageClick: setLightboxImage,
    onConversationClick: onConversationNavigate,
  });

  // Subscribe to replies that e-tag this event (NIP-10/NIP-22 threading)
  // Don't subscribe for kind 11 (CHAT) events as their replies are shown inline in the thread
  const { events: directReplies } = useSubscribe(
    event.kind === NDKKind.GenericReply
      ? [
          {
            kinds: [
              NDKKind.GenericReply,
              1934,
              EVENT_KINDS.STREAMING_RESPONSE,
            ] as any, // Include streaming responses
            "#e": [event.id],
          },
        ]
      : false,
    {
      closeOnEose: false,
      groupable: true,
    },
    [event.id],
  );

  // Process replies into messages with streaming session management
  const replyMessages = useMemo(() => {
    if (!directReplies || directReplies.length === 0) return [];

    // Filter out replies with root marker (they're in the main thread)
    const filtered = directReplies.filter((reply) => {
      const eTags = reply.tags?.filter((tag) => tag[0] === "e");
      const hasRootMarker = eTags?.some((tag) => tag[3] === "root");
      return !hasRootMarker;
    });

    // Use the same processor that ChatInterface uses
    return processEventsToMessages(filtered, null);
  }, [directReplies]);

  const handleReply = useCallback(
    (targetEvent: NDKEvent) => {
      setReplyingTo(targetEvent);
      onReply?.(targetEvent);
    },
    [setReplyingTo, onReply],
  );

  // Count for replies display
  const replyCount = useMemo(() => {
    return replyMessages.length;
  }, [replyMessages]);

  // Check if this is a task event (kind 1934)
  const isTaskEvent = event.kind === NDKTask.kind;

  // Create task object if needed
  const task = useMemo(() => {
    if (isTaskEvent && ndk) {
      return new NDKTask(ndk, event.rawEvent());
    }
    return null;
  }, [isTaskEvent, ndk, event]);

  // Check if this is a reasoning event (has "reasoning" tag)
  const isReasoningEvent = event.hasTag("reasoning");

  // Check if this is a tool call event (kind 1111 with "tool" tag)
  const isToolCallEvent = event.kind === 1111 && event.hasTag("tool");

  // Check if this is a typing indicator event
  const isTypingEvent =
    event.kind === EVENT_KINDS.TYPING_INDICATOR ||
    event.kind === EVENT_KINDS.STREAMING_RESPONSE;

  // For typing events, check if content contains "is typing"
  const showTypingIndicator =
    isTypingEvent && event.content?.includes("is typing");

  // Check if this is a streaming response event (kind 21111) and not a typing indicator
  const isStreamingResponse =
    event.kind === EVENT_KINDS.STREAMING_RESPONSE && !showTypingIndicator;

  // Parse content - remove thinking blocks for display
  const { displayContent, shouldTruncate } = useMemo(() => {
    // Skip parsing if this is a typing indicator
    if (showTypingIndicator) {
      return { displayContent: "", shouldTruncate: false };
    }

    const content = event.content ?? ""; // Empty string is valid content

    // Check if content should be truncated on mobile
    const MAX_LENGTH = 280;
    const shouldTruncate = isMobile && content.length > MAX_LENGTH && !isNested;

    return {
      displayContent: content,
      shouldTruncate,
    };
  }, [event.content, isMobile, isNested, showTypingIndicator]);

  // Extract event metadata using utilities
  const phase = getEventPhase(event);
  const phaseFrom = getEventPhaseFrom(event);

  const llmMetadata = useMemo(() => {
    const metadata = extractLLMMetadata(event);

    // Also check for system-prompt and user-prompt tags (without llm- prefix)
    const systemPromptValue = event.tagValue("system-prompt");
    if (systemPromptValue && !metadata["llm-system-prompt"]) {
      metadata["llm-system-prompt"] = systemPromptValue;
    }

    const userPromptValue = event.tagValue("prompt");
    if (userPromptValue && !metadata["llm-user-prompt"]) {
      metadata["llm-user-prompt"] = userPromptValue;
    }

    // Check for alternative token naming conventions
    const inputTokensValue = event.tagValue("llm-input-tokens");
    if (inputTokensValue && !metadata["llm-prompt-tokens"]) {
      metadata["llm-prompt-tokens"] = inputTokensValue;
    }

    const outputTokensValue = event.tagValue("llm-output-tokens");
    if (outputTokensValue && !metadata["llm-completion-tokens"]) {
      metadata["llm-completion-tokens"] = outputTokensValue;
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }, [event]);

  // Responsive padding and margins
  const paddingClass = isMobile ? "px-3 py-1" : "px-4 py-1";
  const nestedMargin = isMobile ? "ml-4" : "ml-4";
  const contentGap = isMobile ? "gap-2" : "gap-3";

  return (
    <div
      className={cn(
        "relative transition-colors",
        paddingClass,
        isNested && nestedMargin,
        isHovered && "bg-muted/30",
        isBeingRepliedTo && "ring-2 ring-primary/50 bg-primary/5",
        isMobile && "border-b border-border",
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Message layout - completely different for mobile */}
      {isMobile ? (
        // Mobile layout - header with avatar, then full-width content below
        <div className="flex-1">
          {/* Mobile header with avatar and name on same line */}
          <div className="flex items-center gap-2 mb-1">
            {!isNested && (
              <Link
                to="/p/$pubkey"
                params={{ pubkey: event.pubkey }}
                className="flex-shrink-0"
              >
                <NostrProfile
                  pubkey={event.pubkey}
                  size="sm"
                  variant="avatar"
                  className="h-7 w-7 rounded-md"
                />
              </Link>
            )}
            <MessageHeaderContent
              event={event}
              userStatus={userStatus}
              recipientPubkeys={recipientPubkeys}
              phase={phase}
              phaseFrom={phaseFrom}
              onTimeClick={onTimeClick}
              isMobile={isMobile}
              hideTimestamp={false} // Show timestamp in header
              projectId={project?.tagId()}
            />
          </div>

          {/* Message content - full width below header */}
          <div className={cn("markdown-content", isNested && "ml-9")}>
            <div
              className={cn(
                "break-words text-foreground",
                "text-[14px] leading-[1.4]",
              )}
            >
              {/* Show typing indicator for typing events */}
              {showTypingIndicator ? (
                <TypingIndicator users={[{ pubkey: event.pubkey }]} />
              ) : isTaskEvent && task ? (
                // For task events, show TaskContent
                <TaskContent
                  task={task}
                  onClick={() => onConversationNavigate?.(event)}
                />
              ) : isToolCallEvent ? (
                // For 1111 events with "tool" tag, show ToolCallContent
                <ToolCallContent event={event} />
              ) : isReasoningEvent ? (
                // For events with "reasoning" tag, show only the reasoning block
                <AIReasoningBlock
                  reasoningEvent={event}
                  isStreaming={isStreamingResponse}
                  isMobile={true}
                />
              ) : (
                <>
                  {/* Render clean content without thinking blocks */}
                  <div className="streamdown-wrapper [&_.mermaid-container]:!max-w-none [&_.mermaid-container]:overflow-x-auto">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={markdownComponents}
                    >
                      {shouldTruncate && !isExpanded
                        ? displayContent.substring(0, 280)
                        : displayContent}
                    </ReactMarkdown>
                  </div>

                  {/* Show streaming caret when streaming */}
                  {isStreamingResponse && <StreamingCaret className="ml-0.5" />}

                  {/* Show expand/collapse button for truncated content */}
                  {shouldTruncate && displayContent.length > 280 && (
                    <button
                      type="button"
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                    >
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile footer with actions only */}
          {!showTypingIndicator && (
            <div
              className={cn(
                "flex items-center justify-end mt-1",
                isNested && "ml-9",
              )}
            >
              <MessageActionsToolbar
                event={event}
                project={project}
                onReply={() => handleReply(event)}
                onMetadataClick={() => setShowMetadataDialog(true)}
                llmMetadata={llmMetadata}
                isMobile={true}
                isHovered={false}
              />
            </div>
          )}
        </div>
      ) : (
        // Desktop layout - adjust for consecutive messages
        <div className={cn("flex", contentGap)}>
          {/* Avatar column - hide for consecutive messages */}
          {!isConsecutive ? (
            <div className="flex-shrink-0 pt-0.5">
              <Link
                to="/p/$pubkey"
                params={{ pubkey: event.pubkey }}
                className="block hover:opacity-80 transition-opacity"
              >
                <NostrProfile
                  pubkey={event.pubkey}
                  size="md"
                  variant="avatar"
                  className="h-9 w-9 rounded-md"
                />
              </Link>
            </div>
          ) : (
            // Spacer to maintain alignment
            <div className="w-9 flex-shrink-0" />
          )}

          {/* Content column */}
          <div className="flex-1 min-w-0">
            {/* Header row - show only for first message */}
            {!isConsecutive && (
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <MessageHeaderContent
                  event={event}
                  userStatus={userStatus}
                  recipientPubkeys={recipientPubkeys}
                  phase={phase}
                  phaseFrom={phaseFrom}
                  onTimeClick={onTimeClick}
                  isMobile={isMobile}
                  projectId={project?.tagId()}
                  isConsecutive={false}
                />

                {/* Action buttons - desktop hover */}
                {!showTypingIndicator && (
                  <MessageActionsToolbar
                    event={event}
                    project={project}
                    onReply={() => handleReply(event)}
                    onMetadataClick={() => setShowMetadataDialog(true)}
                    llmMetadata={llmMetadata}
                    isMobile={false}
                    isHovered={isHovered}
                    isConsecutive={false}
                  />
                )}
              </div>
            )}

            {/* Message content with inline actions for consecutive messages */}
            <div
              className={cn(
                "markdown-content",
                isConsecutive && "flex items-start justify-between gap-4",
              )}
            >
              <div
                className={cn(
                  "break-words text-foreground flex-1",
                  isMobile ? "text-[14px] leading-[1.4] mt-1" : "text-sm",
                )}
              >
                {/* Show typing indicator for typing events */}
                {showTypingIndicator ? (
                  <TypingIndicator users={[{ pubkey: event.pubkey }]} />
                ) : isTaskEvent && task ? (
                  // For task events, show TaskContent
                  <TaskContent
                    task={task}
                    onClick={() => onConversationNavigate?.(event)}
                  />
                ) : isToolCallEvent ? (
                  // For 1111 events with "tool" tag, show ToolCallContent
                  <ToolCallContent event={event} />
                ) : isReasoningEvent ? (
                  // For events with "reasoning" tag, show only the reasoning block
                  <AIReasoningBlock
                    reasoningEvent={event}
                    isStreaming={isStreamingResponse}
                    isMobile={isMobile}
                  />
                ) : (
                  <>
                    {/* Render clean content without thinking blocks */}
                    <div className="streamdown-wrapper [&_.mermaid-container]:!max-w-none [&_.mermaid-container]:overflow-x-auto">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                      >
                        {shouldTruncate && !isExpanded
                          ? displayContent.substring(0, 280)
                          : displayContent}
                      </ReactMarkdown>
                    </div>

                    {/* Show streaming caret when streaming */}
                    {isStreamingResponse && (
                      <StreamingCaret className="ml-0.5" />
                    )}

                    {/* Show expand/collapse button for truncated content */}
                    {shouldTruncate && displayContent.length > 280 && (
                      <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Inline timestamp and actions for consecutive messages */}
              {isConsecutive && !showTypingIndicator && (
                <div
                  className={cn(
                    "flex items-center gap-2 flex-shrink-0 transition-opacity sticky top-0",
                    isHovered || recipientPubkeys.length > 0
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                >
                  <MessageHeaderContent
                    event={event}
                    userStatus={userStatus}
                    recipientPubkeys={recipientPubkeys}
                    phase={phase}
                    phaseFrom={phaseFrom}
                    onTimeClick={onTimeClick}
                    isMobile={isMobile}
                    projectId={project?.tagId()}
                    isConsecutive={true}
                  />
                  <MessageActionsToolbar
                    event={event}
                    project={project}
                    onReply={() => handleReply(event)}
                    onMetadataClick={() => setShowMetadataDialog(true)}
                    llmMetadata={llmMetadata}
                    isMobile={false}
                    isHovered={true}
                    isConsecutive={true}
                  />
                </div>
              )}
            </div>

            {/* Mobile action toolbar - show inline when message is selected */}
            {!showTypingIndicator && isMobile && isHovered && (
              <MessageActionsToolbar
                event={event}
                project={project}
                onReply={() => handleReply(event)}
                onMetadataClick={() => setShowMetadataDialog(true)}
                llmMetadata={llmMetadata}
                isMobile={true}
                isHovered={false}
              />
            )}
          </div>
        </div>
      )}

      {/* Reply count and toggle - Slack style - hide for typing indicators */}
      {!showTypingIndicator && replyCount > 0 && (
        <div className="mt-1.5">
          <button
            type="button"
            onClick={() => setShowReplies(!showReplies)}
            className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors font-medium hover:bg-blue-50 dark:hover:bg-blue-950/30 px-2 py-1 rounded"
          >
            <div className="flex -space-x-1.5">
              {/* Show up to 20 user avatars who replied */}
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
      )}

      {/* Thread replies - align with message content */}
      {showReplies && replyMessages.length > 0 && (
        <div
          className={cn(
            "border-l-2 border-muted mt-2",
            isMobile ? "ml-3" : "ml-[48px]", // 36px avatar + 12px gap = 48px
          )}
        >
          {replyMessages.map((message) => {
            // Check if this is a task event
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

            // Regular message reply
            return (
              <div key={message.id}>
                <MessageWithReplies
                  event={message.event}
                  project={project}
                  onReply={onReply}
                  isNested={true}
                  onTimeClick={onTimeClick}
                  onConversationNavigate={onConversationNavigate}
                  isConsecutive={false} // First reply in thread should never be consecutive
                />
              </div>
            );
          })}
        </div>
      )}

      {/* LLM Metadata Dialog */}
      {llmMetadata && (
        <LLMMetadataDialog
          open={showMetadataDialog}
          onOpenChange={setShowMetadataDialog}
          metadata={llmMetadata}
        />
      )}
    </div>
  );
});
