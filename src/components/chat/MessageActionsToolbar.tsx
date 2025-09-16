import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Reply, MoreVertical, Cpu, DollarSign, User, Copy, Volume2, Square, Quote, ExternalLink } from "lucide-react";
import { useTTSPlayer } from "@/hooks/useTTSPlayer";
import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatCost } from "@/lib/utils/formatCost";
import { useQuoteModal } from "@/stores/quote-modal";
import { useReply } from "@/components/chat/contexts/ReplyContext";
import { useChatInputFocus } from "@/stores/chat-input-focus";

interface MessageActionsToolbarProps {
  event: NDKEvent;
  project?: NDKProject | null;
  onQuote?: () => void;
  onMetadataClick?: () => void;
  llmMetadata?: Record<string, unknown> | null;
  isMobile: boolean;
  isConsecutive?: boolean;
}

export function MessageActionsToolbar({
  event,
  project,
  onQuote,
  onMetadataClick,
  llmMetadata,
  isMobile,
}: MessageActionsToolbarProps) {
  const [showRawEventDialog, setShowRawEventDialog] = useState(false);
  const navigate = useNavigate();
  const { openQuote } = useQuoteModal();
  const { setReplyingTo } = useReply();
  const { triggerFocus } = useChatInputFocus();
  const {
    play,
    stop,
    currentMessageId,
    isPlaying,
    hasTTS
  } = useTTSPlayer();

  // Check if this message is currently playing
  const isThisMessagePlaying = currentMessageId === event.id && isPlaying;

  const handleTTS = () => {
    if (!hasTTS || !event.content) return;

    if (isThisMessagePlaying) {
      stop();
    } else {
      play(
        event.content,
        event.id,
        event.pubkey
      );
    }
  };

  // Fix for Radix UI Dialog not properly cleaning up body styles
  useEffect(() => {
    if (!showRawEventDialog) {
      // Small delay to ensure dialog animation completes
      const timeout = setTimeout(() => {
        document.body.style.removeProperty("pointer-events");
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [showRawEventDialog]);
  // Mobile layout: Inline actions integrated with message
  if (isMobile) {
    return (
      <div className="flex items-center gap-0.5">
        {/* More options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <MoreVertical className="h-2.5 w-2.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={() => navigate({ to: `/chat/${event.id}` })}
            >
              <ExternalLink className="h-3 w-3 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={() => {
                setReplyingTo(event);
                triggerFocus();
              }}
            >
              <Reply className="h-3 w-3 mr-2" />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={() => {
                if (project) {
                  const quotedContent = `nostr:${event.encode()}`;
                  openQuote(quotedContent, project);
                } else {
                  onQuote?.();
                }
              }}
            >
              <Quote className="h-3 w-3 mr-2" />
              Quote
            </DropdownMenuItem>
            {hasTTS && event.content && (
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={handleTTS}
              >
                {isThisMessagePlaying ? <Square className="h-3 w-3 mr-2" /> : <Volume2 className="h-3 w-3 mr-2" />}
                {isThisMessagePlaying ? "Stop" : "Text to Speech"}
              </DropdownMenuItem>
            )}
            {llmMetadata && (
              <DropdownMenuItem
                className="cursor-pointer text-xs"
                onClick={onMetadataClick}
              >
                <Cpu className="h-3 w-3 mr-2" />
                View LLM Info
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={() => {
                navigator.clipboard.writeText(event.pubkey);
                toast.success("Author pubkey copied");
              }}
            >
              <User className="h-3 w-3 mr-2" />
              Copy Author
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={() => {
                navigator.clipboard.writeText(event.content);
                toast.success("Content copied");
              }}
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy Content
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={() => {
                navigator.clipboard.writeText(event.encode());
                toast.success("ID copied");
              }}
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={() => {
                setShowRawEventDialog(true);
              }}
            >
              View Raw Event
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer text-xs"
              onClick={() => {
                const rawEventString = JSON.stringify(
                  event.rawEvent(),
                  null,
                  2,
                );
                navigator.clipboard.writeText(rawEventString);
                toast.success("Raw event copied");
              }}
            >
              <Copy className="h-3 w-3 mr-2" />
              Copy Raw Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Cost indicator - only show if meaningful */}
        {(() => {
          const costValue = llmMetadata?.["llm-cost-usd"] || llmMetadata?.["llm-cost"];
          const cost = formatCost(
            typeof costValue === 'number' ? costValue :
            typeof costValue === 'string' ? parseFloat(costValue) :
            undefined
          );
          if (!cost) return null;
          return (
            <span
              className="text-[9px] h-4 px-1 text-muted-foreground ml-auto"
            >
              {cost}
            </span>
          );
        })()}
      </div>
    );
  }

  // Desktop layout: Always visible actions
  return (
    <>
      <div
        className="flex items-center gap-0.5"
      >
        {/* More options dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-muted"
              title="Message options"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate({ to: `/chat/${event.id}` })}
            >
              <ExternalLink className="h-3.5 w-3.5 mr-2" />
              Open
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                setReplyingTo(event);
                triggerFocus();
              }}
            >
              <Reply className="h-3.5 w-3.5 mr-2" />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                if (project) {
                  const quotedContent = `nostr:${event.encode()}`;
                  openQuote(quotedContent, project);
                } else {
                  onQuote?.();
                }
              }}
            >
              <Quote className="h-3.5 w-3.5 mr-2" />
              Quote
            </DropdownMenuItem>
            {hasTTS && event.content && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={handleTTS}
              >
                {isPlaying ? <Square className="h-3.5 w-3.5 mr-2" /> : <Volume2 className="h-3.5 w-3.5 mr-2" />}
                {isPlaying ? "Stop" : "Text to Speech"}
              </DropdownMenuItem>
            )}
            {llmMetadata && (
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={onMetadataClick}
              >
                <Cpu className="h-3.5 w-3.5 mr-2" />
                View LLM Info
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(event.pubkey);
                toast.success("Author pubkey copied");
              }}
            >
              <User className="h-3.5 w-3.5 mr-2" />
              Copy Author
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(event.content);
                toast.success("Content copied");
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy Content
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                navigator.clipboard.writeText(event.encode());
                toast.success("ID copied");
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                setShowRawEventDialog(true);
              }}
            >
              View Raw Event
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                const rawEventString = JSON.stringify(
                  event.rawEvent(),
                  null,
                  2,
                );
                navigator.clipboard.writeText(rawEventString);
                toast.success("Raw event copied");
              }}
            >
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy Raw Event
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Cost indicator - only show if meaningful */}
        {(() => {
          const costValue = llmMetadata?.["llm-cost-usd"] || llmMetadata?.["llm-cost"];
          const cost = formatCost(
            typeof costValue === 'number' ? costValue :
            typeof costValue === 'string' ? parseFloat(costValue) :
            undefined
          );
          if (!cost) return null;
          return (
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 text-green-600 border-green-600"
            >
              <DollarSign className="w-3 h-3 mr-0.5" />
              {cost}
            </Badge>
          );
        })()}
      </div>

      {/* Raw Event Dialog */}
      <Dialog open={showRawEventDialog} onOpenChange={setShowRawEventDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raw Event</DialogTitle>
          </DialogHeader>
          <pre className="text-xs bg-muted p-4 rounded-md overflow-x-auto">
            {JSON.stringify(event.rawEvent(), null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}
