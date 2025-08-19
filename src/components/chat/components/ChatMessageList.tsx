import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { VirtualList } from "@/components/ui/virtual-list";
import { ArrowDown, Reply, MoreVertical, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageWithReplies } from "../MessageWithReplies";
import { MessageShell } from "../MessageShell";
import { TaskContent } from "../TaskContent";
import { CompactTaskCard } from "../CompactTaskCard";
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
  onTaskClick?: (task: NDKTask) => void;
  onReplyFocus: () => void;
  isNewThread: boolean;
  isRootEventTask?: boolean;
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
  isRootEventTask = false,
}: ChatMessageListProps) {
  const isMobile = useIsMobile();
  const USE_VIRTUAL_LIST_THRESHOLD = 50; // Use virtual list for more than 50 messages

  const renderMessage = (message: Message, index: number) => {
    // Check if this is a task event
    if (message.event.kind === NDKTask.kind) {
      const task = new NDKTask(ndk!, message.event.rawEvent());
      const isFirstMessage = index === 0;
      // Only use compact mode if the root event is a task (i.e., we're in a task conversation)
      const useCompactMode = isRootEventTask && !isFirstMessage;
      
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
                // For now, just show in console - could open a dialog later
                console.log('Task LLM metadata:', message.event.tags?.filter(tag => 
                  tag[0]?.startsWith('llm-') || tag[0] === 'system-prompt' || tag[0] === 'prompt'
                ));
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
          >
            {useCompactMode ? (
              <CompactTaskCard
                task={task}
                onClick={() => {
                  // Open the task as a conversation
                  if (onTaskClick) {
                    onTaskClick(task);
                  }
                }}
              />
            ) : (
              <TaskContent
                task={task}
                onClick={() => {
                  // Open the task as a conversation
                  if (onTaskClick) {
                    onTaskClick(task);
                  }
                }}
              />
            )}
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
}
