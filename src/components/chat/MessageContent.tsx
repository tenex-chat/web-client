import { memo, useMemo } from "react";
import { NDKEvent, useNDK } from "@nostr-dev-kit/ndk-hooks";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { useMarkdownComponents } from "@/lib/markdown/config";
import { TaskContent } from "./TaskContent";
import { ToolCallContent } from "./ToolCallContent";
import { AIReasoningBlock } from "./AIReasoningBlock";
import { StreamingCaret } from "./StreamingCaret";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { EVENT_KINDS } from "@/lib/constants";

interface MessageContentProps {
  event: NDKEvent;
  isExpanded: boolean;
  onExpand: () => void;
  onConversationNavigate?: (event: NDKEvent) => void;
  isMobile: boolean;
  className?: string;
}

/**
 * Component responsible for rendering message content
 * Handles all content types: markdown, tasks, tool calls, reasoning blocks
 */
export const MessageContent = memo(function MessageContent({
  event,
  isExpanded,
  onExpand,
  onConversationNavigate,
  isMobile,
  className,
}: MessageContentProps) {
  const { ndk } = useNDK();

  // Markdown configuration
  const markdownComponents = useMarkdownComponents({
    isMobile,
    onImageClick: () => {},
    onConversationClick: onConversationNavigate,
  });

  // Check content type
  const isTaskEvent = event.kind === NDKTask.kind;
  const isReasoningEvent = event.hasTag("reasoning");
  const isToolCallEvent = event.kind === 1111 && event.hasTag("tool");
  const isStreamingResponse = event.kind === EVENT_KINDS.STREAMING_RESPONSE;

  // Create task object if needed
  const task = useMemo(() => {
    if (isTaskEvent && ndk) {
      return new NDKTask(ndk, event.rawEvent());
    }
    return null;
  }, [isTaskEvent, ndk, event]);

  // Parse content
  const { displayContent, shouldTruncate } = useMemo(() => {
    const content = event.content ?? "";
    const MAX_LENGTH = 280;
    const shouldTruncate = isMobile && content.length > MAX_LENGTH && !isExpanded;

    return {
      displayContent: content,
      shouldTruncate,
    };
  }, [event.content, isMobile, isExpanded]);

  return (
    <div
      className={cn(
        "break-words text-foreground",
        isMobile ? "text-[14px] leading-[1.4] mt-1" : "text-sm",
        className
      )}
    >
      {isTaskEvent && task ? (
        <TaskContent
          task={task}
          onClick={() => onConversationNavigate?.(event)}
        />
      ) : isToolCallEvent ? (
        <ToolCallContent event={event} />
      ) : isReasoningEvent ? (
        <AIReasoningBlock
          reasoningEvent={event}
          isStreaming={isStreamingResponse}
          isMobile={isMobile}
        />
      ) : (
        <>
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

          {isStreamingResponse && <StreamingCaret className="ml-0.5" />}

          {shouldTruncate && displayContent.length > 280 && (
            <button
              type="button"
              onClick={onExpand}
              className="text-xs text-blue-600 hover:text-blue-700 mt-1"
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
        </>
      )}
    </div>
  );
});