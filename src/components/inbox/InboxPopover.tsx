import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Inbox } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { InboxEventCard } from "./InboxEventCard";
import { useInbox } from "@/hooks/useInboxStore";

interface InboxPopoverProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function InboxPopover({ children, open, onOpenChange }: InboxPopoverProps) {
  const navigate = useNavigate();

  // Get inbox events and unread count from the store
  const { events, unreadCount, lastVisit, markAsRead } = useInbox();

  const handleOpenInboxPage = () => {
    onOpenChange?.(false);
    navigate({ to: "/inbox" });
  };

  const handleEventClick = (eventId: string) => {
    onOpenChange?.(false);
    navigate({ to: "/chat/$eventId", params: { eventId } });
  };

  // Mark as read when opening the popover
  React.useEffect(() => {
    if (open && unreadCount > 0) {
      // Mark as read after a small delay to ensure user actually sees the content
      const timer = setTimeout(() => {
        markAsRead();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [open, unreadCount, markAsRead]);

  // Get recent events to show (max 5)
  const recentEvents = React.useMemo(() => {
    return events.slice(0, 5);
  }, [events]);

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent 
        side="right" 
        align="start"
        className="w-[400px] p-0"
        sideOffset={12}
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
      </PopoverContent>
    </Popover>
  );
}