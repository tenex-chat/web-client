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
import { ReadMore } from "./components/ReadMore";
import { ReactComponentRenderer } from "./components/ReactComponentRenderer";
import { getMessageContent } from "@/lib/utils/brainstorm";

interface MessageContentProps {
  event: NDKEvent;
  isRootEvent?: boolean;
  onConversationNavigate?: (event: NDKEvent) => void;
  isMobile: boolean;
  className?: string;
  message?: {
    isReactComponent?: boolean;
    reactComponentCode?: string;
    reactComponentProps?: Record<string, any>;
  };
}

/**
 * Component responsible for rendering message content
 * Handles all content types: markdown, tasks, tool calls, reasoning blocks
 */
export const MessageContent = memo(function MessageContent({
  event,
  isRootEvent = false,
  onConversationNavigate,
  isMobile,
  className,
  message,
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

  // Parse content - handle brainstorm mode messages
  const displayContent = useMemo(() => {
    return getMessageContent(event);
  }, [event]);

  return (
    <div
      className={cn(
        "break-words text-foreground",
        isMobile ? "text-[14px] leading-[1.4] mt-1" : "text-sm",
        className
      )}
    >
      {message?.isReactComponent && message?.reactComponentCode ? (
        <div className="react-component-container p-2 border rounded">
          <ReactComponentRenderer 
            componentCode={message.reactComponentCode} 
            props={message.reactComponentProps}
          />
        </div>
      ) : isTaskEvent && task && !isRootEvent ? (
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
        <ReadMore maxHeight={400}>
          <div className="streamdown-wrapper [&_.mermaid-container]:!max-w-none [&_.mermaid-container]:overflow-x-auto">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {displayContent}
            </ReactMarkdown>
          </div>

          {isStreamingResponse && <StreamingCaret className="ml-0.5" />}
        </ReadMore>
      )}
    </div>
  );
});