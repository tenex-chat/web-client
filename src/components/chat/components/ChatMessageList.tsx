import React, { memo, useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageWithReplies } from "@/components/chat/MessageWithReplies";
import { MetadataChangeMessage } from "@/components/chat/MetadataChangeMessage";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import type { Message } from "@/components/chat/hooks/useChatMessages";
import { EVENT_KINDS } from "@/lib/constants";
import { useAI } from "@/hooks/useAI";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import { isAudioEvent } from "@/lib/utils/audioEvents";

interface ChatMessageListProps {
  messages: Message[];
  project: NDKProject | null | undefined;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  unreadCount: number;
  scrollToBottom: (smooth?: boolean) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onReplyFocus: () => void;
  isNewThread: boolean;
  autoTTS?: boolean;
  currentUserPubkey?: string;
  onNavigate?: (event: NDKEvent) => void;
}

/**
 * Chat message list component
 * Handles rendering messages and scroll management UI
 */
export const ChatMessageList = memo(function ChatMessageList({
  messages,
  project,
  scrollAreaRef,
  showScrollToBottom,
  unreadCount,
  scrollToBottom,
  onScroll,
  onReplyFocus,
  isNewThread,
  autoTTS = false,
  currentUserPubkey,
  onNavigate,
}: ChatMessageListProps) {
  const isMobile = useIsMobile();
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(null);
  
  // TTS configuration
  const { speak, hasTTS } = useAI();
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play new messages when auto-TTS is enabled
  const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  
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
  }, [latestMessageId, autoTTS, hasTTS, lastPlayedMessageId, currentUserPubkey, isPlaying, speak, messages]);

  const renderMessage = (message: Message, index: number) => {
    // Check if this is a metadata change event (kind 513)
    if (message.event.kind === EVENT_KINDS.CONVERSATION_METADATA) {
      return (
        <div
          key={message.id}
          data-message-author={message.event.pubkey}
        >
          <MetadataChangeMessage
            event={message.event}
            onTimeClick={onNavigate}
          />
        </div>
      );
    }
    
    // Check if this message is consecutive (from same author as previous non-metadata message)
    // Don't treat as consecutive if message has p-tags (recipients)
    const isConsecutive = index > 0 && 
      messages[index - 1].event.pubkey === message.event.pubkey &&
      messages[index - 1].event.kind !== EVENT_KINDS.CONVERSATION_METADATA &&
      message.event.kind !== EVENT_KINDS.CONVERSATION_METADATA;
    
    // All events (including tasks) go through MessageWithReplies
    return (
      <div
        key={message.id}
        data-message-author={message.event.pubkey}
      >
        <MessageWithReplies
          event={message.event}
          project={project}
          onReply={onReplyFocus}
          onTimeClick={onNavigate}
          onConversationNavigate={onNavigate}
          isConsecutive={isConsecutive}
        />
      </div>
    );
  };

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
              {messages.map((message, index) => renderMessage(message, index))}
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
