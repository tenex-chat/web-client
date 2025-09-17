import { memo, useMemo, useState, useEffect } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { EVENT_KINDS } from "@/lib/constants";
import { NostrProfile } from "@/components/common/NostrProfile";
import { LLMMetadataDialog } from "@/components/dialogs/LLMMetadataDialog";
import { MessageHeaderContent } from "./MessageHeaderContent";
import { MessageActionsToolbar } from "./MessageActionsToolbar";
import { MessageContent } from "./MessageContent";
import { MetadataChangeMessage } from "./MetadataChangeMessage";
import { TypingIndicator } from "./TypingIndicator";
import {
  extractLLMMetadata,
  getEventPhase,
  getEventPhaseFrom,
} from "@/lib/utils/event-metadata";
import { getUserStatus } from "@/lib/utils/userStatus";
import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useIsMobile } from "@/hooks/useMediaQuery";

// Global render counter for tracking
const renderCounts = new Map<string, number>();

interface MessageProps {
  event: NDKEvent;
  project?: NDKProject | null;
  isRootEvent?: boolean;
  isConsecutive?: boolean;
  hasNextConsecutive?: boolean;
  isNested?: boolean;
  onTimeClick?: (event: NDKEvent) => void;
  onConversationNavigate?: (event: NDKEvent) => void;
  message?: {
    isReactComponent?: boolean;
    reactComponentCode?: string;
    reactComponentProps?: Record<string, any>;
  };
}

/**
 * Pure message display component
 * Only responsible for rendering a single message
 */
export const Message = memo(function Message({
  event,
  project,
  isRootEvent = false,
  isConsecutive = false,
  hasNextConsecutive = false,
  isNested = false,
  onTimeClick,
  onConversationNavigate,
  message,
}: MessageProps) {
  const user = useNDKCurrentUser();
  const isMobile = useIsMobile();
  const [showMetadataDialog, setShowMetadataDialog] = useState(false);

  // Track render count
  useEffect(() => {
    const eventId = event.id || 'unknown';
    const currentCount = renderCounts.get(eventId) || 0;
    const newCount = currentCount + 1;
    renderCounts.set(eventId, newCount);

    console.log(`Rendering message ${eventId}: ${newCount} times`);

    // Log summary of all render counts
    if (renderCounts.size > 1) {
      console.log('=== All message render counts ===');
      renderCounts.forEach((count, id) => {
        console.log(`  ${id.substring(0, 8)}...: ${count} renders`);
      });
      console.log('================================');
    }
  });

  // Get user status
  const userStatus = useMemo(() => {
    return getUserStatus(event.pubkey, user?.pubkey, project?.dTag || "");
  }, [event.pubkey, user?.pubkey, project?.dTag]);

  // Extract recipients
  const recipientPubkeys = useMemo(() => {
    if (!event.tags) return [];
    return event.tags
      .filter((tag) => tag[0] === "p" && tag[1])
      .map((tag) => tag[1])
      .filter((pubkey, index, self) => self.indexOf(pubkey) === index);
  }, [event.tags]);

  // Extract metadata
  const phase = getEventPhase(event);
  const phaseFrom = getEventPhaseFrom(event);
  const llmMetadata = useMemo(() => {
    const metadata = extractLLMMetadata(event);

    const systemPromptValue = event.tagValue("system-prompt");
    if (systemPromptValue && !metadata["llm-system-prompt"]) {
      metadata["llm-system-prompt"] = systemPromptValue;
    }

    const userPromptValue = event.tagValue("prompt");
    if (userPromptValue && !metadata["llm-user-prompt"]) {
      metadata["llm-user-prompt"] = userPromptValue;
    }

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

  // Check if this is a typing event
  const isTypingEvent =
    event.kind === EVENT_KINDS.TYPING_INDICATOR ||
    event.kind === EVENT_KINDS.STREAMING_RESPONSE;
  const showTypingIndicator =
    isTypingEvent && event.content?.includes("is typing");

  // Check if this is a metadata change event
  if (event.kind === EVENT_KINDS.CONVERSATION_METADATA) {
    return (
      <div data-message-author={event.pubkey}>
        <MetadataChangeMessage
          event={event}
          onTimeClick={onTimeClick}
        />
      </div>
    );
  }

  // Handle typing indicator
  if (showTypingIndicator) {
    return (
      <div
        className={cn(
          "relative transition-colors px-4 py-1",
          isNested && "ml-4"
        )}
      >
        <div className="flex gap-3">
          {!isConsecutive && (
            <div className="flex-shrink-0 pt-0.5">
              <NostrProfile
                pubkey={event.pubkey}
                size="md"
                variant="avatar"
                className="h-9 w-9 rounded-md"
              />
            </div>
          )}
          {isConsecutive && <div className="w-9 flex-shrink-0" />}
          <div className="flex-1">
            <TypingIndicator users={[{ pubkey: event.pubkey }]} />
          </div>
        </div>
      </div>
    );
  }

  const paddingClass = isMobile ? "px-3 py-1" : "px-4 py-1";
  const contentGap = isMobile ? "gap-2" : "gap-3";

  return (
    <div
      data-message-author={event.pubkey}
      className={cn(
        "relative transition-colors hover:bg-muted/30",
        paddingClass,
        isMobile && "border-b border-border"
      )}
    >
      {isMobile ? (
        // Mobile layout
        <div className="flex-1">
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
              hideTimestamp={false}
              projectId={project?.tagId()}
            />
          </div>

          <div className={cn("markdown-content", isNested && "ml-9")}>
            <MessageContent
              event={event}
              isRootEvent={isRootEvent}
              onConversationNavigate={onConversationNavigate}
              isMobile={isMobile}
              message={message}
            />
          </div>

          <div className={cn("flex items-center justify-end mt-1", isNested && "ml-9")}>
            <MessageActionsToolbar
              event={event}
              project={project}
              onMetadataClick={() => setShowMetadataDialog(true)}
              llmMetadata={llmMetadata}
              isMobile={true}
            />
          </div>
        </div>
      ) : (
        // Desktop layout
        <div className={cn("flex", contentGap)}>
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
            <div className="w-9 flex-shrink-0 relative">
              {/* Thread line for consecutive messages */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-px bg-border/60"
                style={{
                  top: '-4px',
                  height: hasNextConsecutive ? 'calc(100% + 8px)' : '14px'
                }}
              />
              {/* Dot indicator at message start */}
              <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-1.5 h-1.5 bg-muted-foreground/80 rounded-full" />
            </div>
          )}

          <div className="flex-1 min-w-0">
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

                <MessageActionsToolbar
                  event={event}
                  project={project}
                          onMetadataClick={() => setShowMetadataDialog(true)}
                  llmMetadata={llmMetadata}
                  isMobile={false}
                  isConsecutive={false}
                />
              </div>
            )}

            <div className={cn("markdown-content", isConsecutive && "flex items-start justify-between gap-4")}>
              <MessageContent
                event={event}
                isRootEvent={isRootEvent}
                onConversationNavigate={onConversationNavigate}
                isMobile={isMobile}
                className="flex-1"
                message={message}
              />

              {isConsecutive && (
                <div
                  className="flex items-center gap-2 flex-shrink-0 sticky top-0"
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
                                onMetadataClick={() => setShowMetadataDialog(true)}
                    llmMetadata={llmMetadata}
                    isMobile={false}
                    isConsecutive={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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