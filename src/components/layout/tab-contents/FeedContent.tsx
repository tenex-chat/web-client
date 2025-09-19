import React, { useMemo, useRef, useState } from "react";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Users, MessageSquare, FileText, Hash, Bot, Phone, Search, X, Filter, Check } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { nip19 } from "nostr-tools";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { useProjectOnlineAgents } from "@/hooks/useProjectOnlineAgents";
import { NostrProfile } from "@/components/common/NostrProfile";
import { useConversationMetadata } from "@/hooks/useConversationMetadata";

interface FeedContentProps {
  project: NDKProject;
  onEventClick?: (event: NDKEvent) => void;
}

interface EventItemProps {
  event: NDKEvent;
  project: NDKProject;
  onClick?: () => void;
}

// Component to show author avatar in the filter button
const AuthorAvatar: React.FC<{ pubkey: string }> = ({ pubkey }) => {
  const profile = useProfileValue(pubkey);

  const fallbackName = useMemo(() => {
    if (profile?.displayName || profile?.name) {
      return (profile.displayName || profile.name).slice(0, 2).toUpperCase();
    }
    try {
      const npub = nip19.npubEncode(pubkey);
      return npub.slice(4, 6).toUpperCase();
    } catch {
      return 'UN';
    }
  }, [profile, pubkey]);

  return (
    <Avatar className="h-6 w-6">
      <AvatarImage src={profile?.image || profile?.picture} alt={profile?.displayName || profile?.name} />
      <AvatarFallback className="text-[10px]">
        {fallbackName}
      </AvatarFallback>
    </Avatar>
  );
};

const EventItem: React.FC<EventItemProps> = ({
  event,
  project,
  onClick
}) => {
  const profile = useProfileValue(event.pubkey);
  const conversationMetadata = useConversationMetadata(event);
  
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
    // If we have a conversation title from metadata, prefer that
    if (conversationMetadata.hasTitle && conversationMetadata.title) {
      // Determine the icon and label based on the event kind
      switch (event.kind) {
        case NDKKind.Text:
          return {
            icon: <MessageSquare className="h-3.5 w-3.5" />,
            label: "Note",
            title: conversationMetadata.title
          };
        case NDKKind.Article:
          return {
            icon: <FileText className="h-3.5 w-3.5" />,
            label: "Article",
            title: conversationMetadata.title
          };
        case 1111:
          return {
            icon: <MessageSquare className="h-3.5 w-3.5" />,
            label: "Reply",
            title: conversationMetadata.title
          };
        case 29000:
          return {
            icon: <Phone className="h-3.5 w-3.5" />,
            label: "Call",
            title: conversationMetadata.title
          };
        case 1905:
        case 31905:
          return {
            icon: <Bot className="h-3.5 w-3.5" />,
            label: "Agent",
            title: conversationMetadata.title
          };
        default:
          return {
            icon: <Hash className="h-3.5 w-3.5" />,
            label: `Kind ${event.kind}`,
            title: conversationMetadata.title
          };
      }
    }
    
    // Fall back to original logic if no conversation title
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
  }, [event, conversationMetadata]);

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

export const FeedContent: React.FC<FeedContentProps> = ({
  project,
  onEventClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [groupThreads, setGroupThreads] = useState(false);
  const currentUser = useNDKCurrentUser();
  const agents = useProjectOnlineAgents(project?.dTag);
  
  // Single subscription using project.filter()
  const { events } = useSubscribe(
    [project.filter()],
    {},
    [project.dTag]
  );

  // Filter out ephemeral events and kind 0, then optionally group by E tag and sort
  const sortedEvents = useMemo(() => {
    // First filter out unwanted events
    const validEvents = events.filter(event => {
      const kind = event.kind || 0;
      // Skip kind 0 (metadata) and ephemeral events (kinds 20000-29999)
      if (kind === 0 || (kind >= 20000 && kind <= 29999)) {
        return false;
      }
      return true;
    });

    // If groupThreads is enabled, deduplicate by E tag
    if (groupThreads) {
      // Group events by E tag value
      const eventsByETag = new Map<string | null, NDKEvent[]>();
      
      validEvents.forEach(event => {
        // Get the E tag value (uppercase E tag)
        const eTag = event.tags.find(tag => tag[0] === 'E')?.[1] || null;
        
        // Group events by their E tag value (or null if no E tag)
        const existing = eventsByETag.get(eTag) || [];
        existing.push(event);
        eventsByETag.set(eTag, existing);
      });

      // For each E tag group, keep only the most recent event
      const deduplicatedEvents: NDKEvent[] = [];
      
      eventsByETag.forEach((groupedEvents, eTag) => {
        if (eTag === null) {
          // No E tag - include all events from this group
          deduplicatedEvents.push(...groupedEvents);
        } else {
          // Has E tag - only include the most recent one
          const mostRecent = groupedEvents.reduce((latest, current) => {
            const latestTime = latest.created_at || 0;
            const currentTime = current.created_at || 0;
            return currentTime > latestTime ? current : latest;
          });
          deduplicatedEvents.push(mostRecent);
        }
      });

      // Sort deduplicated events by creation time (newest first)
      return deduplicatedEvents.sort((a, b) => {
        const timeA = a.created_at || 0;
        const timeB = b.created_at || 0;
        return timeB - timeA;
      });
    } else {
      // No grouping, just sort all valid events
      return validEvents.sort((a, b) => {
        const timeA = a.created_at || 0;
        const timeB = b.created_at || 0;
        return timeB - timeA;
      });
    }
  }, [events, groupThreads]);

  // Function to check if an event matches the search query
  const eventMatchesSearch = (event: NDKEvent, query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    
    // Check event content
    if (event.content && event.content.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    // Check article title (for kind 30023)
    if (event.kind === NDKKind.Article) {
      const title = event.tagValue("title") || event.tagValue("name") || "";
      if (title.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }
    
    // Check call subject (for kind 29000)
    if (event.kind === 29000) {
      const subject = event.tagValue("subject") || "";
      if (subject.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }
    
    // Check agent name (for kinds 1905 and 31905)
    if (event.kind === 1905 || event.kind === 31905) {
      const name = event.tagValue("name") || "";
      if (name.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }
    
    // Check hashtags
    const hashtags = event.tags
      .filter(tag => tag[0] === 't')
      .map(tag => tag[1]);
    
    for (const hashtag of hashtags) {
      if (hashtag.toLowerCase().includes(lowerQuery)) {
        return true;
      }
    }
    
    return false;
  };

  // Create stable pubkey list for dependency
  const eventPubkeysKey = useMemo(() => {
    const validPubkeys = events
      .filter(event => {
        const kind = event.kind || 0;
        return !(kind === 0 || (kind >= 20000 && kind <= 29999));
      })
      .map(e => e.pubkey)
      .sort()
      .join(',');
    return validPubkeys;
  }, [events]);

  // Get unique authors with stable sorting - only recalculate when actual event pubkeys change
  const uniqueAuthors = useMemo(() => {
    // Create a stable key from all pubkeys to detect actual changes
    const pubkeysSet = new Set<string>();
    const authorEventCounts = new Map<string, number>();

    // Use events directly to avoid dependency on sortedEvents which changes frequently
    events.forEach(event => {
      const kind = event.kind || 0;
      // Skip the same events we filter out in sortedEvents
      if (kind === 0 || (kind >= 20000 && kind <= 29999)) {
        return;
      }
      pubkeysSet.add(event.pubkey);
      authorEventCounts.set(event.pubkey, (authorEventCounts.get(event.pubkey) || 0) + 1);
    });

    // Convert to array and sort by pubkey first for absolute stability
    const allAuthors = Array.from(pubkeysSet).sort();

    // Now sort by event count with pubkey as stable tiebreaker
    const sortedByActivity = allAuthors
      .sort((a, b) => {
        const countA = authorEventCounts.get(a) || 0;
        const countB = authorEventCounts.get(b) || 0;
        if (countA !== countB) return countB - countA;
        // Already sorted by pubkey, maintain that order
        return a.localeCompare(b);
      })
      .slice(0, 15);

    // Build final list with current user first
    const result: string[] = [];

    // Add current user first if they have events
    if (currentUser?.pubkey && sortedByActivity.includes(currentUser.pubkey)) {
      result.push(currentUser.pubkey);
    }

    // Add other authors, maintaining sort order
    sortedByActivity.forEach(pubkey => {
      if (pubkey !== currentUser?.pubkey) {
        result.push(pubkey);
      }
    });

    return result;
  }, [events, eventPubkeysKey, currentUser?.pubkey]);

  // Filter events based on search query and author
  const filteredEvents = useMemo(() => {
    let filtered = sortedEvents;
    
    // Apply author filter
    if (selectedAuthor) {
      filtered = filtered.filter(event => event.pubkey === selectedAuthor);
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(event => eventMatchesSearch(event, searchQuery));
    }
    
    return filtered;
  }, [sortedEvents, searchQuery, selectedAuthor]);

  // Ref for the scrolling container
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual list configuration
  const virtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height for each item
    overscan: 5, // Number of items to render outside of the visible area
  });

  // Handle empty states
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

  // Handle no search results
  const showNoResults = searchQuery && filteredEvents.length === 0;

  return (
    <div className="h-full flex flex-col">
      {/* Search Input and Filter - Only show when there are events */}
      {sortedEvents.length > 0 && (
        <div className="p-3 border-b bg-background/50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events, titles, subjects, hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            
            {/* Author Filter Button */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={selectedAuthor ? "default" : "outline"}
                  size="sm"
                  className="h-9 w-9 p-0"
                >
                  {selectedAuthor ? (
                    <AuthorAvatar pubkey={selectedAuthor} />
                  ) : (
                    <Filter className="h-3.5 w-3.5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                {/* Group threads checkbox */}
                <DropdownMenuCheckboxItem
                  checked={groupThreads}
                  onCheckedChange={setGroupThreads}
                >
                  Group threads
                </DropdownMenuCheckboxItem>
                
                <DropdownMenuSeparator />
                
                <DropdownMenuItem
                  onClick={() => setSelectedAuthor(null)}
                  className={!selectedAuthor ? "bg-accent" : ""}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>All Authors</span>
                    {!selectedAuthor && <Check className="h-3.5 w-3.5" />}
                  </div>
                </DropdownMenuItem>
                
                {uniqueAuthors.length > 0 && <DropdownMenuSeparator />}

                {/* List all authors */}
                {uniqueAuthors.map(pubkey => {
                  const isCurrentUser = currentUser && pubkey === currentUser.pubkey;

                  return (
                    <DropdownMenuItem
                      key={pubkey}
                      onClick={() => setSelectedAuthor(pubkey)}
                      className={selectedAuthor === pubkey ? "bg-accent" : ""}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <NostrProfile
                            pubkey={pubkey}
                            variant="avatar"
                            size="xs"
                            className="flex-shrink-0"
                          />
                          {isCurrentUser ? (
                            <span>You</span>
                          ) : (
                            <NostrProfile
                              pubkey={pubkey}
                              variant="name"
                              className="text-sm"
                            />
                          )}
                        </div>
                        {selectedAuthor === pubkey && <Check className="h-3.5 w-3.5" />}
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      {/* Event list or no results message */}
      {showNoResults ? (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <Search className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <h3 className="font-semibold text-sm mb-1">No results found</h3>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Try adjusting your search terms
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="mt-3"
          >
            Clear search
          </Button>
        </div>
      ) : (
        <div ref={parentRef} className="flex-1 overflow-auto">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const event = filteredEvents[virtualItem.index];
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
      )}
    </div>
  );
};