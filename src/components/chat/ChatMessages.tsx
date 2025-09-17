import React, { memo, useState, useEffect, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThreadedMessage } from "./ThreadedMessage";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import type { Message as MessageType } from "@/components/chat/hooks/useChatMessages";
import { EVENT_KINDS } from "@/lib/constants";
import { useAI } from "@/hooks/useAI";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import { isAudioEvent } from "@/lib/utils/audioEvents";
import { useThreadViewModeStore } from "@/stores/thread-view-mode-store";

interface ChatMessagesProps {
  messages: MessageType[];
  project: NDKProject | null | undefined;
  rootEvent?: NDKEvent | null;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  unreadCount: number;
  scrollToBottom: (smooth?: boolean) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  isNewThread: boolean;
  autoTTS?: boolean;
  currentUserPubkey?: string;
  onNavigate?: (event: NDKEvent) => void;
}

/**
 * Chat messages container
 * Handles scroll area, TTS, and renders messages with ThreadedMessage
 */
export const ChatMessages = memo(function ChatMessages({
  messages,
  project,
  rootEvent,
  scrollAreaRef,
  showScrollToBottom,
  unreadCount,
  scrollToBottom,
  onScroll,
  isNewThread,
  autoTTS = false,
  currentUserPubkey,
  onNavigate,
}: ChatMessagesProps) {
  const isMobile = useIsMobile();
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(
    null,
  );

  // TTS configuration
  const { speak, hasTTS } = useAI();
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play new messages when auto-TTS is enabled
  const latestMessageId =
    messages.length > 0 ? messages[messages.length - 1].id : null;

  useEffect(() => {
    if (!autoTTS || !latestMessageId || messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];

    // Don't play messages from the current user
    if (latestMessage.event.pubkey === currentUserPubkey) return;

    // Don't play the same message twice
    if (latestMessage.id === lastPlayedMessageId) return;

    // Don't play audio messages (they have their own player)
    if (isAudioEvent(latestMessage.event)) return;

    // Extract and play TTS content
    const ttsContent = extractTTSContent(latestMessage.event.content);
    if (ttsContent && !isPlaying && hasTTS) {
      setIsPlaying(true);
      speak(ttsContent)
        .then(async (audioBlob) => {
          const audio = new Audio(URL.createObjectURL(audioBlob));
          await audio.play();
          audio.onended = () => setIsPlaying(false);
        })
        .catch(() => {
          toast.error("TTS playback failed");
          setIsPlaying(false);
        });
      setLastPlayedMessageId(latestMessage.id);
    }
  }, [
    latestMessageId,
    autoTTS,
    hasTTS,
    lastPlayedMessageId,
    currentUserPubkey,
    isPlaying,
    speak,
    messages,
  ]);

  // Track which events we've already rendered to avoid duplicates
  const processedEventIds = useMemo(() => new Set<string>(), []);

  // Filter to only show messages that are direct replies to the root
  // OR messages that don't have e-tags pointing to other messages in this thread
  const rootLevelMessages = useMemo(() => {
    const messageIds = new Set(messages.map(m => m.event.id));

    return messages.filter(message => {
      const eTags = message.event.tags?.filter(tag => tag[0] === 'e') || [];

      // If no e-tags, it's a root message
      if (eTags.length === 0) return true;

      // Check if this message replies to something other than the root
      for (const eTag of eTags) {
        const referencedId = eTag[1];

        // If it references another message in our thread (not the root),
        // it should be nested, not at root level
        if (messageIds.has(referencedId) && referencedId !== rootEvent?.id) {
          return false;
        }
      }

      return true;
    });
  }, [messages, rootEvent]);

  return (
    <div className="flex-1 overflow-hidden relative">
      {messages.length === 0 && !isNewThread ? (
        <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
          No messages yet. Start the conversation!
        </div>
      ) : (
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full pb-4"
          onScrollCapture={onScroll}
        >
          <div className={isMobile ? "py-0 pb-48" : "py-2 pb-48"}>
            <div className="divide-y divide-transparent">
              {rootLevelMessages.map((message, index) => {
                // Skip metadata events for consecutive check
                const isConsecutive =
                  index > 0 &&
                  rootLevelMessages[index - 1].event.pubkey === message.event.pubkey &&
                  rootLevelMessages[index - 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
                  message.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
                  !message.event.tags?.some(tag => tag[0] === 'p') &&
                  !rootLevelMessages[index - 1].event.tags?.some(tag => tag[0] === 'p');

                const hasNextConsecutive =
                  index < rootLevelMessages.length - 1 &&
                  rootLevelMessages[index + 1].event.pubkey === message.event.pubkey &&
                  rootLevelMessages[index + 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
                  message.event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
                  !rootLevelMessages[index + 1].event.tags?.some(tag => tag[0] === 'p') &&
                  !message.event.tags?.some(tag => tag[0] === 'p');

                return (
                  <ThreadedMessage
                    key={message.id}
                    message={message}
                    depth={0}
                    project={project}
                    onTimeClick={onNavigate}
                    onConversationNavigate={onNavigate}
                    processedEventIds={processedEventIds}
                    isConsecutive={isConsecutive}
                    hasNextConsecutive={hasNextConsecutive}
                  />
                );
              })}
            </div>
          </div>
        </ScrollArea>
      )}

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollToBottom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-4 right-4 z-30"
          >
            <Button
              onClick={() => scrollToBottom(true)}
              size="icon"
              className={cn(
                "rounded-full shadow-lg",
                "bg-primary hover:bg-primary/90",
                "w-10 h-10",
                unreadCount > 0 && "animate-pulse",
              )}
            >
              <div className="relative">
                <ArrowDown className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </div>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});