import React, { useMemo, useRef } from "react";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Users, MessageSquare, FileText, Hash, Bot, Phone } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { nip19 } from "nostr-tools";
import { cn } from "@/lib/utils";

interface CommunityContentProps {
  project: NDKProject;
  onEventClick?: (event: NDKEvent) => void;
}

interface EventItemProps {
  event: NDKEvent;
  project: NDKProject;
  onClick?: () => void;
}

const EventItem: React.FC<EventItemProps> = ({ 
  event, 
  project,
  onClick 
}) => {
  const profile = useProfileValue(event.pubkey);
  
  // Format author display name
  const authorName = useMemo(() => {
    if (profile?.displayName || profile?.name) {
      return profile.displayName || profile.name;
    }
    try {
      const npub = nip19.npubEncode(event.pubkey);
      return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
    } catch {
      return 'Unknown';
    }
  }, [profile, event.pubkey]);

  // Determine event type and rendering details based on actual kind
  const { icon, label, title } = useMemo(() => {
    switch (event.kind) {
      case NDKKind.Text: // kind 1 - text note
        return {
          icon: <MessageSquare className="h-3.5 w-3.5" />,
          label: "Note",
          title: event.content.length > 100 
            ? event.content.slice(0, 100) + "..." 
            : event.content
        };
        
      case NDKKind.Article: // kind 30023 - long-form content
        return {
          icon: <FileText className="h-3.5 w-3.5" />,
          label: "Article",
          title: event.tagValue("title") || event.tagValue("name") || "Untitled"
        };
        
      case 1111: // kind 1111 - generic reply
        return {
          icon: <MessageSquare className="h-3.5 w-3.5" />,
          label: "Reply",
          title: event.content.length > 100 
            ? event.content.slice(0, 100) + "..." 
            : event.content
        };
        
      case 29000: // kind 29000 - call event
        return {
          icon: <Phone className="h-3.5 w-3.5" />,
          label: "Call",
          title: event.tagValue("subject") || "Voice Call"
        };
        
      case 1905: // kind 1905 - agent event
      case 31905: // kind 31905 - agent definition
        return {
          icon: <Bot className="h-3.5 w-3.5" />,
          label: "Agent",
          title: event.tagValue("name") || "Agent Activity"
        };
        
      default:
        return {
          icon: <Hash className="h-3.5 w-3.5" />,
          label: `Kind ${event.kind}`,
          title: event.content?.slice(0, 100) || "Event"
        };
    }
  }, [event]);

  // Get hashtags for the event
  const hashtags = useMemo(() => {
    return event.tags
      .filter(tag => tag[0] === 't')
      .map(tag => tag[1])
      .slice(0, 3); // Show max 3 tags
  }, [event.tags]);

  return (
    <div
      className={cn(
        "px-3 py-3 hover:bg-accent/50 cursor-pointer transition-colors border-b",
        "group"
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Author Avatar */}
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarImage src={profile?.image || profile?.picture} alt={authorName} />
          <AvatarFallback className="text-xs">
            {authorName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{authorName}</span>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {icon}
              <span>{label}</span>
              <span>·</span>
              <span>{formatRelativeTime(event.created_at || 0)}</span>
            </div>
          </div>

          {/* Title/Preview */}
          <div className="text-sm text-foreground/90 break-words line-clamp-2">
            {title}
          </div>

          {/* Hashtags if present */}
          {hashtags.length > 0 && (
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {hashtags.map((tag, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground"
                >
                  <Hash className="h-2.5 w-2.5" />
                  <span>{tag}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CommunityContent: React.FC<CommunityContentProps> = ({ 
  project, 
  onEventClick 
}) => {
  // Single subscription using project.filter()
  const { events } = useSubscribe(
    [project.filter()],
    {},
    [project.dTag]
  );

  // Filter out ephemeral events and kind 0, then sort by creation time (newest first)
  const sortedEvents = useMemo(() => {
    return [...events]
      .filter(event => {
        const kind = event.kind || 0;
        // Skip kind 0 (metadata) and ephemeral events (kinds 20000-29999)
        return kind !== 0 && (kind < 20000 || kind > 29999);
      })
      .sort((a, b) => {
        const timeA = a.created_at || 0;
        const timeB = b.created_at || 0;
        return timeB - timeA;
      });
  }, [events]);

  // Ref for the scrolling container
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual list configuration
  const virtualizer = useVirtualizer({
    count: sortedEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height for each item
    overscan: 5, // Number of items to render outside of the visible area
  });

  // Empty state
  if (sortedEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold text-sm mb-1">No events yet</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Events from this project will appear here
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const event = sortedEvents[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <EventItem
                event={event}
                project={project}
                onClick={() => onEventClick?.(event)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};