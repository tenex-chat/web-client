import React, { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Users, MessageSquare, FileText, Hash } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { nip19 } from "nostr-tools";
import { cn } from "@/lib/utils";

interface CommunityContentProps {
  project: NDKProject;
  onEventClick?: (event: NDKEvent) => void;
}

interface CommunityEventItemProps {
  event: NDKEvent;
  type: "conversation" | "document" | "hashtag";
  project: NDKProject;
  onClick?: () => void;
}

const CommunityEventItem: React.FC<CommunityEventItemProps> = ({ 
  event, 
  type, 
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

  // Get event icon based on type
  const eventIcon = useMemo(() => {
    switch (type) {
      case "conversation":
        return <MessageSquare className="h-3.5 w-3.5" />;
      case "document":
        return <FileText className="h-3.5 w-3.5" />;
      case "hashtag":
        return <Hash className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  }, [type]);

  // Get event type label
  const eventTypeLabel = useMemo(() => {
    switch (type) {
      case "conversation":
        return "Conversation";
      case "document":
        return "Document";
      case "hashtag":
        return "Post";
      default:
        return "Event";
    }
  }, [type]);

  // Get event title or preview
  const eventTitle = useMemo(() => {
    if (event.kind === 30023) {
      // Article/documentation
      return event.tagValue("title") || event.tagValue("name") || "Untitled Document";
    } else if (event.kind === 24133) {
      // Conversation root event
      const title = event.tagValue("title");
      if (title) return title;
      
      // Try to get first message preview
      const content = event.content;
      if (content.length > 100) {
        return content.slice(0, 100) + "...";
      }
      return content || "New conversation";
    } else {
      // Regular text note (hashtag event)
      const content = event.content;
      if (content.length > 100) {
        return content.slice(0, 100) + "...";
      }
      return content;
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
              {eventIcon}
              <span>{eventTypeLabel}</span>
              <span>·</span>
              <span>{formatRelativeTime(event.created_at || 0)}</span>
            </div>
          </div>

          {/* Title/Preview */}
          <div className="text-sm text-foreground/90 break-words line-clamp-2">
            {eventTitle}
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
  // Get project hashtags for filtering
  const projectHashtags = useMemo(() => {
    return project.hashtags || [];
  }, [project]);

  // Subscribe to conversation roots (kind 24133)
  const { events: conversationRoots } = useSubscribe(
    [{
      kinds: [24133 as NDKKind],
      ...project.filter()
    }],
    {},
    [project.dTag]
  );

  // Subscribe to project documents (kind 30023)
  const { events: documents } = useSubscribe(
    [{
      kinds: [30023 as NDKKind],
      "#d": [`doc:${project.dTag}`],
    }],
    {},
    [project.dTag]
  );

  // Subscribe to hashtag events if hashtags are configured
  const { events: hashtagEvents } = useSubscribe(
    projectHashtags.length > 0 ? [{
      kinds: [NDKKind.Text], // kind:1 text notes
      "#t": projectHashtags.map(tag => tag.toLowerCase().replace(/^#/, '')),
    }] : [],
    {},
    [projectHashtags]
  );

  // Combine and sort all events by creation time
  const allEvents = useMemo(() => {
    const events: Array<{ event: NDKEvent; type: "conversation" | "document" | "hashtag" }> = [];
    
    // Add conversation roots
    conversationRoots.forEach(event => {
      events.push({ event, type: "conversation" });
    });
    
    // Add documents
    documents.forEach(event => {
      events.push({ event, type: "document" });
    });
    
    // Add hashtag events
    hashtagEvents.forEach(event => {
      events.push({ event, type: "hashtag" });
    });

    // Sort by creation time (newest first)
    return events.sort((a, b) => {
      const timeA = a.event.created_at || 0;
      const timeB = b.event.created_at || 0;
      return timeB - timeA;
    });
  }, [conversationRoots, documents, hashtagEvents]);

  // Empty state
  if (allEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Users className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold text-sm mb-1">No community activity yet</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Conversations, documents, and posts will appear here as they're created
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {allEvents.map(({ event, type }) => (
          <CommunityEventItem
            key={event.id}
            event={event}
            type={type}
            project={project}
            onClick={() => onEventClick?.(event)}
          />
        ))}
      </div>
    </ScrollArea>
  );
};