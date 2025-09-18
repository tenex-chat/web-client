import React, { memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThreadedMessage } from "./ThreadedMessage";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

interface ChatMessagesProps {
  project: NDKProject | null | undefined;
  conversationEvent: NDKEvent;
  scrollAreaRef: React.RefObject<HTMLDivElement>;
  showScrollToBottom: boolean;
  unreadCount: number;
  scrollToBottom: (smooth?: boolean) => void;
  onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  onNavigate?: (event: NDKEvent) => void;
}

/**
 * Chat messages container
 * Handles scroll area and renders messages with ThreadedMessage
 */
export const ChatMessages = memo(function ChatMessages({
  project,
  conversationEvent,
  scrollAreaRef,
  showScrollToBottom,
  unreadCount,
  scrollToBottom,
  onScroll,
  onNavigate,
}: ChatMessagesProps) {
  const isMobile = useIsMobile();

  return (
    <div className="flex-1 overflow-hidden relative">
      <ScrollArea
        ref={scrollAreaRef}
        className="h-full pb-4"
        onScrollCapture={onScroll}
      >
        <div className={isMobile ? "py-0 pb-48" : "py-2 pb-48"}>
          <div className="divide-y divide-transparent">
            <ThreadedMessage
              eventId={conversationEvent.id}
              depth={0}
              project={project}
              onTimeClick={onNavigate}
              onConversationNavigate={onNavigate}
            />
          </div>
        </div>
      </ScrollArea>

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