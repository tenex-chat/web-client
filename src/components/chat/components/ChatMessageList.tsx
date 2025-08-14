import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { VirtualList } from "@/components/ui/virtual-list";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageWithReplies } from "../MessageWithReplies";
import { TaskCard } from "@/components/tasks/TaskCard";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { EVENT_KINDS } from "@/lib/constants";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type NDK from "@nostr-dev-kit/ndk-hooks";
import type { Message } from "../hooks/useChatMessages";

interface ChatMessageListProps {
  messages: Message[];
  project: NDKProject;
  ndk: NDK | undefined;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  unreadCount: number;
  scrollToBottom: (smooth?: boolean) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onTaskClick?: (taskId: string) => void;
  onReplyFocus: () => void;
  isNewThread: boolean;
}

/**
 * Chat message list component
 * Handles rendering messages and scroll management UI
 */
export function ChatMessageList({
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
}: ChatMessageListProps) {
  const isMobile = useIsMobile();
  const USE_VIRTUAL_LIST_THRESHOLD = 50; // Use virtual list for more than 50 messages

  const renderMessage = (message: Message) => {
    // Check if this is a task event
    if (message.event.kind === EVENT_KINDS.TASK) {
      const task = new NDKTask(ndk!, message.event.rawEvent());
      return (
        <div
          key={message.id}
          data-message-author={message.event.pubkey}
        >
          <TaskCard
            task={task}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => {
              // Open the task as a conversation
              if (onTaskClick) {
                onTaskClick(task.id);
              }
            }}
          />
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
          renderItem={renderMessage}
          estimateSize={120} // Estimated average message height
          overscan={5}
          containerClassName="h-full pb-4"
          className={isMobile ? "py-0 pb-20" : "py-2 pb-20"}
        />
      ) : (
        // Use regular ScrollArea for small message lists
        <ScrollArea
          ref={scrollAreaRef}
          className="h-full pb-4"
          onScrollCapture={onScroll}
        >
          <div className={isMobile ? "py-0 pb-20" : "py-2 pb-20"}>
            <div className="divide-y divide-transparent">
              {messages.map(renderMessage)}
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
}
