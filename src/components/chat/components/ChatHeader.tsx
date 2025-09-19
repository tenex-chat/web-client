import { useMemo } from "react";
import {
  ArrowLeft,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { ConversationAgents } from "./ConversationAgents";
import { ChatHeaderTitle } from "./ChatHeaderTitle";
import { ChatHeaderProjectInfo } from "./ChatHeaderProjectInfo";
import { ChatHeaderActionsMenu } from "./ChatHeaderActionsMenu";
import { VoiceCallButton } from "./VoiceCallButton";
import type { NDKEvent as NDKEventType } from "@nostr-dev-kit/ndk-hooks";
import type { Message } from "@/components/chat/hooks/useChatMessages";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { useConversationMetadata } from "@/hooks/useConversationMetadata";
import { ConversationStopButton } from "@/components/chat/ConversationStopButton";

interface ChatHeaderProps {
  rootEvent: NDKEventType | null;
  onBack?: () => void;
  onDetach?: () => void;
  messages?: Message[];
  project?: NDKProject | null;
  onVoiceCallClick?: () => void;
  onNavigateToParent?: (parentId: string) => void;
}

/**
 * Chat header component - orchestrates sub-components
 * Displays thread info and provides navigation/actions
 */
export function ChatHeader({
  rootEvent,
  onBack,
  onDetach,
  messages,
  project,
  onVoiceCallClick,
  onNavigateToParent,
}: ChatHeaderProps) {
  const isMobile = useIsMobile();
  const isNewThread = !rootEvent;
  
  // Check if rootEvent has a parent "e" tag
  const parentEventId = rootEvent?.tags?.find((tag: string[]) => tag[0] === "e")?.[1];

  // Subscribe to metadata updates for this conversation
  const metadata = useConversationMetadata(rootEvent || undefined);

  /*
   * NOTE: ESC key handler for mobile drawer closing was removed as per clean code requirements.
   * This logic should be handled by the parent component that manages the drawer visibility.
   * The parent component (e.g., ChatDrawer or Layout) should manage its own keyboard shortcuts.
   */

  // Get thread title
  const threadTitle = useMemo(() => {
    // First priority: metadata title from kind 513 event
    if (metadata?.title) {
      return metadata.title;
    }

    // Second priority: title tag from root event
    if (rootEvent) {
      const titleTag = rootEvent.tags?.find(
        (tag: string[]) => tag[0] === "title",
      )?.[1];
      if (titleTag) return titleTag;

      // Fallback to first line of content
      const firstLine = rootEvent.content?.split("\n")[0] || "Thread";
      return firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine;
    }

    return isNewThread ? "New Conversation" : "Thread";
  }, [rootEvent, isNewThread, metadata?.title]);

  return (
    <div className="bg-card border-b border-border/60 backdrop-blur-xl bg-card/95 sticky top-0 z-50">
      <div
        className={cn(
          "flex items-center justify-between",
          isMobile ? "px-3 py-2" : "px-3 sm:px-4 py-3 sm:py-4",
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
          {/* Back button */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent flex-shrink-0"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
          
          {/* Project Avatar */}
          {project && (
            <ProjectAvatar
              project={project}
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
              fallbackClassName="text-xs"
            />
          )}
          
          {/* Title and Project Info */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <ChatHeaderTitle
              title={threadTitle}
              rootEventId={rootEvent?.id}
              isMobile={isMobile}
            />
            <ChatHeaderProjectInfo
              projectTitle={project?.title}
              parentEventId={parentEventId}
              onNavigateToParent={onNavigateToParent}
              isMobile={isMobile}
            />
          </div>
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Conversation Agents */}
          {rootEvent && messages && project && messages.length > 0 && (
            <div className={cn(isMobile && "scale-75 -mr-1", "flex-shrink-0")}>
              <ConversationAgents
                messages={messages}
                project={project}
                rootEvent={rootEvent}
              />
            </div>
          )}
          
          {/* Actions Menu */}
          {rootEvent && messages && messages.length > 0 && (
            <ChatHeaderActionsMenu
              rootEvent={rootEvent}
              messages={messages}
            />
          )}
          
          {/* Conversation Stop Button */}
          {rootEvent && project?.tagId() && (
            <ConversationStopButton
              conversationRootId={rootEvent.id}
              projectId={project.tagId()}
            />
          )}

          {/* Voice Call Button */}
          <VoiceCallButton onVoiceCallClick={onVoiceCallClick} />
          
          {/* Detach Button */}
          {onDetach && !isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDetach}
              className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
              aria-label="Detach to floating window"
            >
              <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
          
          {/* Close Button (mobile) */}
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent lg:hidden"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}