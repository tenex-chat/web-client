import { memo, useMemo, useCallback } from "react";
import { NDKEvent, NDKKind, NDKProject, useNDK, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
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
import { SuggestionButtons } from "./SuggestionButtons";
import { toast } from "sonner";

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
  isLastMessage?: boolean;
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
  isLastMessage = false,
}: MessageContentProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();

  // Markdown configuration
  const markdownComponents = useMarkdownComponents({
    isMobile,
    onImageClick: () => {},
    onConversationClick: onConversationNavigate,
  });

  // Check content type
  const isTaskEvent = event.kind === NDKTask.kind;
  const isReasoningEvent = event.hasTag("reasoning");
  const isToolCallEvent = event.kind === NDKKind.GenericReply && event.hasTag("tool");
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

  // Check if event has suggestion tags
  const hasSuggestions = event.tags?.some(tag => tag[0] === "suggestion");

  // Handle suggestion click - send the selected suggestion as a kind:1111 reply
  const handleSuggestionClick = useCallback(async (suggestion: string, _index: number) => {
    if (!ndk || !user) {
      toast.error("Unable to send response. Please ensure you're logged in.");
      return;
    }

    try {
      // Create a kind:1111 (GenericReply) event with the selected suggestion as content
      const replyEvent = new NDKEvent(ndk);
      replyEvent.kind = NDKKind.GenericReply; // GenericReply event (kind: 1111)
      replyEvent.content = suggestion;
      
      // Add necessary tags for the reply
      replyEvent.tags = [
        ["e", event.id], // Reply to the event with suggestions
      ];

      // Add p-tag for the author of the original event (the one asking the question)
      replyEvent.tags.push(["p", event.pubkey]);

      // If this is in a project context, add the project tag
      const projectTag = event.tags.find(tag => tag[0] === "a" && tag[1]?.startsWith(NDKProject.kind.toString()));
      if (projectTag) {
        replyEvent.tags.push(projectTag);
      }

      // Sign and publish the event
      await replyEvent.sign();
      await replyEvent.publish();

      toast.success("Response sent!");
    } catch (error) {
      console.error("Failed to send suggestion response:", error);
      toast.error("Failed to send response. Please try again.");
    }
  }, [ndk, user, event]);

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
          isLastMessage={isLastMessage}
        />
      ) : (
        <>
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

          {/* Render suggestion buttons if they exist */}
          {hasSuggestions && (
            <SuggestionButtons
              event={event}
              onSuggestionClick={handleSuggestionClick}
              isMobile={isMobile}
            />
          )}
        </>
      )}
    </div>
  );
});