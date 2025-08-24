import { useMemo, useState } from "react";
import { ArrowLeft, Phone, PhoneOff, Settings, Copy, Check, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
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
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe, useNDK } from "@nostr-dev-kit/ndk-hooks";
import type { Message } from "../hooks/useChatMessages";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { formatThreadAsMarkdown, formatThreadAsJSON } from "../utils/copyThread";
import { ProjectAvatar } from "@/components/ui/project-avatar";

interface ChatHeaderProps {
  rootEvent: NDKEvent | null;
  onBack?: () => void;
  autoTTS: boolean;
  onAutoTTSChange: (enabled: boolean) => void;
  ttsEnabled: boolean;
  messages?: Message[];
  project?: NDKProject | null;
  onVoiceCallClick?: () => void;
}

/**
 * Chat header component
 * Handles thread title display, back navigation, and TTS toggle
 */
export function ChatHeader({
  rootEvent,
  onBack,
  autoTTS,
  onAutoTTSChange,
  ttsEnabled,
  messages,
  project,
  onVoiceCallClick,
}: ChatHeaderProps) {
  const isMobile = useIsMobile();
  const isNewThread = !rootEvent;
  const [showTTSInfo, setShowTTSInfo] = useState(false);
  const [copiedFormat, setCopiedFormat] = useState<'markdown' | 'json' | null>(null);
  const { ndk } = useNDK();

  // Get thread title
  const threadTitle = useMemo(() => {
    if (rootEvent) {
      const titleTag = rootEvent.tags?.find(
        (tag: string[]) => tag[0] === "title",
      )?.[1];
      if (titleTag) return titleTag;
      // Fallback to first line of content
      const firstLine = rootEvent.content?.split("\n")[0] || "Thread";
      return firstLine.length > 50 ? `${firstLine.slice(0, 50)}...` : firstLine;
    }
    return isNewThread ? "New Thread" : "Thread";
  }, [rootEvent, isNewThread]);

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
    [rootEvent?.id]
  );

  const handleCopyThread = async (format: 'markdown' | 'json') => {
    if (messages) {
      try {
        let content: string;
        if (format === 'json') {
          content = await formatThreadAsJSON(messages, rootEvent, allThreadReplies || [], ndk || undefined);
        } else {
          content = await formatThreadAsMarkdown(messages, rootEvent, allThreadReplies || [], ndk || undefined);
        }
        await navigator.clipboard.writeText(content);
        setCopiedFormat(format);
        setTimeout(() => setCopiedFormat(null), 2000);
      } catch (error) {
        console.error(`Failed to copy thread as ${format}:`, error);
      }
    }
  };

  if (!rootEvent) return null;

  return (
    <div className="bg-card border-b border-border/60 backdrop-blur-xl bg-card/95 sticky top-0 z-50">
      <div
        className={cn(
          "flex items-center justify-between",
          isMobile ? "px-3 py-2" : "px-3 sm:px-4 py-3 sm:py-4",
        )}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Always show back button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          {/* Project Avatar */}
          {project && (
            <ProjectAvatar 
              project={project} 
              className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
              fallbackClassName="text-xs"
            />
          )}
          <div className="flex-1 min-w-0">
            <h1
              className={cn(
                "font-semibold text-foreground truncate",
                isMobile ? "text-base max-w-40" : "text-lg sm:text-xl max-w-48",
              )}
            >
              {threadTitle}
            </h1>
            <p
              className={cn(
                "text-muted-foreground",
                isMobile ? "text-[10px] mt-0" : "text-xs mt-0.5",
              )}
            >
              {project?.title || 'Project'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Conversation Agents - show inline but smaller on mobile */}
          {messages && project && messages.length > 0 && (
            <div className={cn(isMobile && "scale-75 -mr-1")}>
              <ConversationAgents
                messages={messages}
                project={project}
                rootEvent={rootEvent}
              />
            </div>
          )}
          {/* Copy thread dropdown */}
          {messages && messages.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
                  title="Copy thread"
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
                  onClick={() => handleCopyThread('markdown')}
                  className="cursor-pointer"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy as Markdown
                  {copiedFormat === 'markdown' && (
                    <Check className="w-4 h-4 ml-auto text-green-600" />
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleCopyThread('json')}
                  className="cursor-pointer"
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  Copy as JSON
                  {copiedFormat === 'json' && (
                    <Check className="w-4 h-4 ml-auto text-green-600" />
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {/* Voice call button - always visible */}
          {ttsEnabled ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onVoiceCallClick}
              className="w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent"
              title="Start voice call"
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
                  title="Voice mode not configured"
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
                    To enable voice mode, you need to configure Text-to-Speech settings.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Go to Settings → TTS and add your Murf.ai API key and select a voice.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setShowTTSInfo(false);
                      // Navigate to settings - this would need to be passed as a prop or use routing
                      window.location.href = '/settings?tab=tts';
                    }}
                  >
                    Go to Settings
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
