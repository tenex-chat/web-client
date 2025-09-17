import { useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useNDKCurrentPubkey } from "@nostr-dev-kit/ndk-hooks";
import { Inbox, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { markInboxAsReadAtom, lastInboxVisitAtom } from "@/stores/inbox";
import { useInboxEvents } from "@/hooks/useInboxEvents";
import { InboxEventCard } from "./InboxEventCard";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InboxPage() {
  const currentPubkey = useNDKCurrentPubkey();
  const [, markAsRead] = useAtom(markInboxAsReadAtom);
  const lastVisit = useAtomValue(lastInboxVisitAtom);
  
  // Debug log
  useEffect(() => {
    console.log('[InboxPage] Component mounted at', window.location.pathname);
    return () => {
      console.log('[InboxPage] Component unmounting from', window.location.pathname);
    };
  }, []);
  
  // Fetch inbox events
  const { events, loading } = useInboxEvents();
  
  // Mark inbox as read when the page is opened
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  if (!currentPubkey) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h2 className="text-lg font-medium mb-2">Sign in to view your inbox</h2>
        <p className="text-sm text-muted-foreground">
          You need to be logged in to see your notifications
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold">Inbox</h1>
            <span className="text-sm text-muted-foreground">
              {events.length > 0 ? `${events.length} events` : ""}
            </span>
            {events.some(e => e.created_at && e.created_at > lastVisit) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-muted-foreground cursor-help">
                      (New items have a blue bar and "New" badge)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>New messages are highlighted with:</p>
                    <ul className="text-sm mt-1">
                      <li>• A blue vertical bar on the left</li>
                      <li>• A pulsing "New" badge</li>
                      <li>• Light blue background</li>
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {/* Filter dropdown (for future use) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                All Events
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>All Events</DropdownMenuItem>
              <DropdownMenuItem>Mentions</DropdownMenuItem>
              <DropdownMenuItem>Agent Responses</DropdownMenuItem>
              <DropdownMenuItem>Thread Replies</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-lg font-medium mb-2">Your inbox is empty</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              When agents complete tasks or someone mentions you, those events will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {events.map((event) => (
              <InboxEventCard
                key={event.id}
                event={event}
                isUnread={event.created_at ? event.created_at > lastVisit : false}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}