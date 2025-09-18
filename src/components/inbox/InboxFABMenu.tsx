import * as React from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Inbox, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { FAB } from "@/components/ui/fab";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { InboxEventCard } from "./InboxEventCard";
import { useInboxEvents } from "@/hooks/useInboxEvents";
import { useAtom, useAtomValue } from "jotai";
import { lastInboxVisitAtom, markInboxAsReadAtom } from "@/stores/inbox";
import { useNDKCurrentPubkey } from "@nostr-dev-kit/ndk-hooks";
import { useInboxShortcut } from "@/hooks/useKeyboardShortcuts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InboxFABMenuProps {
  className?: string;
  offset?: {
    bottom?: string;
    right?: string;
  };
}

export function InboxFABMenu({ className, offset }: InboxFABMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPubkey = useNDKCurrentPubkey();
  const [, markAsRead] = useAtom(markInboxAsReadAtom);
  const lastVisit = useAtomValue(lastInboxVisitAtom);
  
  // Get inbox events and unread count
  const { events, unreadCount, loading } = useInboxEvents();

  // Add keyboard shortcut for toggling inbox
  useInboxShortcut(() => setIsOpen(!isOpen));

  // Don't show on certain routes
  const shouldHide = React.useMemo(() => {
    const path = location.pathname;
    
    // Hide on inbox page itself, login, and mobile project detail pages
    return (
      path === "/inbox" || 
      path.startsWith("/inbox/") ||
      path === "/login" ||
      path.startsWith("/login/")
    );
  }, [location.pathname]);

  // Don't render if we shouldn't show or if user isn't logged in
  if (shouldHide || !currentPubkey) {
    return null;
  }

  const handleOpenInboxPage = () => {
    setIsOpen(false);
    navigate({ to: "/inbox" });
  };

  const handleEventClick = (eventId: string) => {
    setIsOpen(false);
    navigate({ to: "/chat/$eventId", params: { eventId } });
  };

  // Mark as read when opening the menu
  React.useEffect(() => {
    if (isOpen && unreadCount > 0) {
      // Mark as read after a small delay to ensure user actually sees the content
      const timer = setTimeout(() => {
        markAsRead();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, unreadCount, markAsRead]);

  // Get recent events to show (max 5)
  const recentEvents = React.useMemo(() => {
    return events.slice(0, 5);
  }, [events]);

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-[60]"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Expanded menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed z-[70] bg-background rounded-lg shadow-2xl overflow-hidden"
            style={{
              bottom: offset?.bottom || "80px",
              right: offset?.right || "16px",
              width: "min(400px, calc(100vw - 32px))",
              maxHeight: "60vh",
            }}
          >
            {/* Header */}
            <div className="border-b px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                <h3 className="font-semibold">Inbox</h3>
                {events.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    ({events.length} events)
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenInboxPage}
              >
                View All
              </Button>
            </div>

            {/* Content */}
            {events.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Inbox className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Your inbox is empty</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="divide-y">
                  {recentEvents.map((event) => (
                    <div
                      key={event.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleEventClick(event.id)}
                    >
                      <InboxEventCard
                        event={event}
                        isUnread={event.created_at ? event.created_at > lastVisit : false}
                        compact
                      />
                    </div>
                  ))}
                </div>
                {events.length > 5 && (
                  <div className="p-3 text-center border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleOpenInboxPage}
                      className="w-full"
                    >
                      View all {events.length} events →
                    </Button>
                  </div>
                )}
              </ScrollArea>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <FAB
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                "transition-all",
                isOpen && "rotate-0",
                className
              )}
              offset={offset}
              variant={unreadCount > 0 ? "destructive" : "secondary"}
            >
              <div className="relative">
                {isOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <>
                    <Inbox className="h-6 w-6" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-3 -right-3 h-5 min-w-[20px] p-0 flex items-center justify-center text-[10px] animate-pulse"
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </FAB>
          </TooltipTrigger>
          {!isOpen && (
            <TooltipContent side="left">
              <p>
                Inbox
                {unreadCount > 0 && ` (${unreadCount} unread)`}
              </p>
              <p className="text-xs text-muted-foreground">⌘I</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </>
  );
}