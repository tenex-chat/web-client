import { useMemo, useState, useEffect } from "react";
import {
  ArrowLeft,
  Phone,
  PhoneOff,
  Settings,
  Copy,
  Check,
  FileJson,
  ExternalLink,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { toast } from "sonner";
import { ConversationAgents } from "./ConversationAgents";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { type NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe, useNDK } from "@nostr-dev-kit/ndk-hooks";
import type { Message } from "@/components/chat/hooks/useChatMessages";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import {
  formatThreadAsMarkdown,
  formatThreadAsJSON,
} from "@/components/chat/utils/copyThread";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import { useConversationMetadata } from "@/hooks/useConversationMetadata";
import { useAI } from "@/hooks/useAI";
import { ConversationStopButton } from "@/components/chat/ConversationStopButton";
import { ThreadViewToggle } from "./ThreadViewToggle";

interface ChatHeaderProps {
  rootEvent: NDKEvent | null;
  onBack?: () => void;
  onDetach?: () => void;
  messages?: Message[];
  project?: NDKProject | null;
  onVoiceCallClick?: () => void;
  onNavigateToParent?: (parentId: string) => void;
}

/**
 * Chat header component
 * Handles thread title display, back navigation, and TTS toggle
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
  const [showTTSInfo, setShowTTSInfo] = useState(false);
  const { hasTTS } = useAI();
  const ttsEnabled = hasTTS;
  const [copiedFormat, setCopiedFormat] = useState<"markdown" | "json" | null>(
    null,
  );
  const { ndk } = useNDK();
  
  // Check if rootEvent has a parent "e" tag
  const parentEventId = rootEvent?.tags?.find((tag: string[]) => tag[0] === "e")?.[1];

  // Subscribe to metadata updates for this conversation
  const metadata = useConversationMetadata(rootEvent?.id);

  // Add ESC key handler to close drawer
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onBack) {
        onBack();
      }
    };

    document.addEventListener("keydown", handleEscKey);
    return () => document.removeEventListener("keydown", handleEscKey);
  }, [onBack]);

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

  // Subscribe to ALL thread replies (not just direct replies) to get nested replies for copying
  const { events: allThreadReplies } = useSubscribe(
    rootEvent && messages && messages.length > 0
      ? [
          {
            kinds: [NDKKind.GenericReply],
            "#E": [rootEvent.id], // Get all events that reference this thread root
          },
        ]
      : false,
    { closeOnEose: false, groupable: true },
    [rootEvent?.id],
  );

  const handleCopyThread = async (format: "markdown" | "json") => {
    if (messages) {
      try {
        let content: string;
        if (format === "json") {
          content = await formatThreadAsJSON(
            messages,
            rootEvent,
            allThreadReplies || [],
            ndk || undefined,
          );
        } else {
          content = await formatThreadAsMarkdown(
            messages,
            rootEvent,
            allThreadReplies || [],
            ndk || undefined,
          );
        }
        await navigator.clipboard.writeText(content);
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
      } catch {
        toast.error(`Failed to copy thread as ${format}`);
      }
    }
  };

  return (
    <div className="bg-card border-b border-border/60 backdrop-blur-xl bg-card/95 sticky top-0 z-50">
      <div
        className={cn(
          "flex items-center justify-between",
          isMobile ? "px-3 py-2" : "px-3 sm:px-4 py-3 sm:py-4",
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
          {/* Always show back button */}
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
          <div className="flex-1 min-w-0 overflow-hidden">
            <h1
              className={cn(
                "font-semibold text-foreground truncate",
                isMobile ? "text-base" : "text-lg sm:text-xl",
              )}
            >
              {threadTitle}
            </h1>
            <div className="flex items-center gap-2 flex-1">
              {project?.title && (
                <p
                  className={cn(
                    "text-muted-foreground",
                    isMobile ? "text-[10px] mt-0" : "text-xs mt-0.5",
                  )}
                >
                  {project.title}
                </p>
              )}
              {parentEventId && onNavigateToParent && (
                <button
                  onClick={() => onNavigateToParent(parentEventId)}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  Go to parent
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Conversation Agents - show inline but smaller on mobile */}
          {rootEvent && messages && project && messages.length > 0 && (
            <div className={cn(isMobile && "scale-75 -mr-1", "flex-shrink-0")}>
              <ConversationAgents
                messages={messages}
                project={project}
                rootEvent={rootEvent}
              />
            </div>
          )}
          {/* Thread View Toggle - only show when there's a conversation with messages */}
          {rootEvent && messages && messages.length > 0 && (
            <ThreadViewToggle />
          )}
          {/* Copy thread dropdown */}
          {rootEvent && messages && messages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
                  aria-label="Copy thread"
                >
                  {copiedFormat ? (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleCopyThread("markdown")}
                  className="cursor-pointer"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy as Markdown
                  {copiedFormat === "markdown" && (
                    <Check className="w-4 h-4 ml-auto text-green-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleCopyThread("json")}
                  className="cursor-pointer"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Copy as JSON
                  {copiedFormat === "json" && (
                    <Check className="w-4 h-4 ml-auto text-green-600" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Conversation-level stop button */}
          {rootEvent && project?.tagId() && (
            <ConversationStopButton
              conversationRootId={rootEvent.id}
              projectId={project.tagId()}
            />
          )}

          {/* Voice call button - always visible */}
          {ttsEnabled ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onVoiceCallClick}
              className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
              aria-label="Start voice call"
            >
              <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          ) : (
            <Popover open={showTTSInfo} onOpenChange={setShowTTSInfo}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
                  aria-label="Voice mode not configured"
                >
                  <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <div className="font-semibold flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Voice Mode Not Configured
                  </div>
                  <p className="text-sm text-muted-foreground">
                    To enable voice mode, you need to configure Text-to-Speech
                    settings.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Go to Settings → AI and configure your text-to-speech
                    settings.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setShowTTSInfo(false);
                      // Navigate to settings - this would need to be passed as a prop or use routing
                      window.location.href = "/settings?tab=tts";
                    }}
                  >
                    Go to Settings
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {/* Detach button for drawer mode */}
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
          {/* Close button for drawer mode */}
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
