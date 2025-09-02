import React, { memo, useCallback, useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { VirtualList } from "@/components/ui/virtual-list";
import { ArrowDown, Reply, MoreVertical, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageWithReplies } from "@/components/chat/MessageWithReplies";
import { MessageShell } from "@/components/chat/MessageShell";
import { TaskContent } from "@/components/chat/TaskContent";
import { MetadataChangeMessage } from "@/components/chat/MetadataChangeMessage";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk-hooks";
import type { Message } from "@/components/chat/hooks/useChatMessages";
import { EVENT_KINDS } from "@/lib/constants";
import { useAI } from "@/hooks/useAI";
import { useAgentVoiceConfig } from "@/hooks/useAgentVoiceConfig";
import { extractTTSContent } from "@/lib/utils/extractTTSContent";
import { isAudioEvent } from "@/lib/utils/audioEvents";

interface ChatMessageListProps {
  messages: Message[];
  project: NDKProject | null | undefined;
  ndk: NDK | undefined;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  unreadCount: number;
  scrollToBottom: (smooth?: boolean) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onTaskClick?: (task: NDKTask) => void;
  onReplyFocus: () => void;
  isNewThread: boolean;
  isRootEventTask?: boolean;
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
  ndk,
  scrollAreaRef,
  showScrollToBottom,
  unreadCount,
  scrollToBottom,
  onScroll,
  onTaskClick,
  onReplyFocus,
  isNewThread,
  isRootEventTask = false,
  autoTTS = false,
  currentUserPubkey,
  onNavigate,
}: ChatMessageListProps) {
  const isMobile = useIsMobile();
  const [lastPlayedMessageId, setLastPlayedMessageId] = useState<string | null>(null);
  
  // TTS configuration
  const { speak, hasTTS } = useAI();
  const [isPlaying, setIsPlaying] = useState(false);

  // Handle clicking on a message timestamp to navigate
  const handleTimeClick = useCallback((event: NDKEvent) => {
    if (onNavigate) {
      onNavigate(event);
      // Scroll to top when changing root
      setTimeout(() => {
        scrollToBottom(false);
      }, 100);
    }
  }, [onNavigate, scrollToBottom]);

  // Auto-play new messages when auto-TTS is enabled
  const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
  
  useEffect(() => {
    if (!autoTTS || !ttsOptions || !latestMessageId || messages.length === 0) return;

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
  const USE_VIRTUAL_LIST_THRESHOLD = 50; // Use virtual list for more than 50 messages

  const renderMessage = (message: Message, index: number) => {
    console.log(message.event.content)
    
    // Check if this is a metadata change event (kind 513)
    if (message.event.kind === EVENT_KINDS.CONVERSATION_METADATA) {
      return (
        <div
          key={message.id}
          data-message-author={message.event.pubkey}
        >
          <MetadataChangeMessage
            event={message.event}
            onTimeClick={handleTimeClick}
          />
        </div>
      );
    }
    
    // Check if this is a task event
    if (message.event.kind === NDKTask.kind) {
      const task = new NDKTask(ndk!, message.event.rawEvent());
      const isFirstMessage = index === 0;
      
      // Check for LLM metadata tags
      const hasLLMMetadata = message.event.tags?.some(tag => 
        tag[0]?.startsWith('llm-') || 
        tag[0] === 'system-prompt' || 
        tag[0] === 'prompt'
      );
      
      // Build header actions for tasks
      const taskHeaderActions = (
        <>
          {/* Reply button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onReplyFocus()}
            className="h-7 w-7 p-0 hover:bg-muted"
            title="Reply to this task"
          >
            <Reply className="h-3.5 w-3.5" />
          </Button>
          
          {/* LLM Metadata Icon if present */}
          {hasLLMMetadata && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                // Show metadata in a toast for now
                const llmTags = message.event.tags?.filter(tag => 
                  tag[0]?.startsWith('llm-') || tag[0] === 'system-prompt' || tag[0] === 'prompt'
                );
                if (llmTags && llmTags.length > 0) {
                  toast.info(`LLM metadata: ${llmTags.length} tags found`);
                }
              }}
              className="h-7 w-7 p-0 hover:bg-muted"
              title="View LLM metadata"
            >
              <Cpu className="h-3.5 w-3.5" />
            </Button>
          )}
          
          {/* More options dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 hover:bg-muted"
                title="Task options"
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => {
                  navigator.clipboard.writeText(message.event.encode())
                }}
              >
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => {
                  const rawEventString = JSON.stringify(message.event.rawEvent(), null, 2)
                  navigator.clipboard.writeText(rawEventString)
                  toast.success('Raw event copied to clipboard')
                }}
              >
                View Raw
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={() => {
                  const rawEventString = JSON.stringify(message.event.rawEvent(), null, 4)
                  navigator.clipboard.writeText(rawEventString)
                }}
              >
                Copy Raw Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      );
      
      // If this is the first message AND the root event is a task, show only content
      if (isRootEventTask && isFirstMessage) {
        return (
          <div
            key={message.id}
            data-message-author={message.event.pubkey}
          >
            <MessageShell
              event={message.event}
              project={project}
              headerActions={taskHeaderActions}
              onTimeClick={handleTimeClick}
            >
              {/* Show only the task content for the first message */}
              <div className="text-sm text-foreground/90 whitespace-pre-wrap">
                {task.content || ''}
              </div>
            </MessageShell>
          </div>
        );
      }
      
      // For task messages: use compact mode only if root is a task and this isn't the first message
      return (
        <div
          key={message.id}
          data-message-author={message.event.pubkey}
        >
          <MessageShell
            event={message.event}
            project={project}
            headerActions={taskHeaderActions}
            onTimeClick={handleTimeClick}
          >
            <TaskContent
              task={task}
              onClick={() => {
                // Open the task as a conversation
                if (onTaskClick) {
                  onTaskClick(task);
                }
              }}
            />
          </MessageShell>
        </div>
      );
    }

    // All other events (1111, 21111, etc) go through MessageWithReplies
    return (
      <div
        key={message.id}
        data-message-author={message.event.pubkey}
      >
        <MessageWithReplies
          event={message.event}
          project={project}
          onReply={onReplyFocus}
          onTimeClick={handleTimeClick}
          onConversationNavigate={onNavigate}
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
      ) : messages.length > USE_VIRTUAL_LIST_THRESHOLD ? (
        // Use VirtualList for large message lists
        <VirtualList
          items={messages}
          renderItem={(message, index) => renderMessage(message, index)}
          estimateSize={120} // Estimated average message height
          overscan={5}
          containerClassName="h-full pb-4"
          className={isMobile ? "py-0 pb-28" : "py-2 pb-28"}
        />
      ) : (
        // Use regular ScrollArea for small message lists
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full pb-4"
          onScrollCapture={onScroll}
        >
          <div className={isMobile ? "py-0 pb-28" : "py-2 pb-28"}>
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
