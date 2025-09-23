import React, { useMemo, useRef, useState } from "react";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useSubscribe, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Users, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AuthorFilterDropdown } from "./AuthorFilterDropdown";
import { EventItem } from "./EventItem";
import { deduplicateEventsByETag, sortEventsByTime } from "@/lib/utils/eventDeduplication";

interface FeedContentProps {
  project: NDKProject;
  onEventClick?: (event: NDKEvent) => void;
}

export const FeedContent: React.FC<FeedContentProps> = ({
  project,
  onEventClick
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null);
  const [groupThreads, setGroupThreads] = useState(false);
  const currentUser = useNDKCurrentUser();
  
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
      const deduplicated = deduplicateEventsByETag(validEvents);
      return sortEventsByTime(deduplicated);
    } else {
      // No grouping, just sort all valid events
      return sortEventsByTime(validEvents);
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

  // Extract unique pubkeys first
  const uniquePubkeysString = useMemo(() => {
    const pubkeysSet = new Set<string>();
    
    events.forEach(event => {
      const kind = event.kind || 0;
      // Skip the same events we filter out in sortedEvents
      if (kind === 0 || (kind >= 20000 && kind <= 29999)) {
        return;
      }
      pubkeysSet.add(event.pubkey);
    });

    // Create a stable string key from sorted pubkeys
    return Array.from(pubkeysSet).sort().join(',');
  }, [events]);

  // Get unique authors with stable sorting - only recalculate when the set of pubkeys actually changes
  const uniqueAuthors = useMemo(() => {
    const pubkeysSet = new Set<string>();
    const authorEventCounts = new Map<string, number>();

    // Use events directly to count events per author
    events.forEach(event => {
      const kind = event.kind || 0;
      // Skip the same events we filter out in sortedEvents
      if (kind === 0 || (kind >= 20000 && kind <= 29999)) {
        return;
      }
      pubkeysSet.add(event.pubkey);
      authorEventCounts.set(event.pubkey, (authorEventCounts.get(event.pubkey) || 0) + 1);
    });

    // Convert to array and sort by pubkey for absolute stability
    // This ensures the order is deterministic and doesn't change randomly
    const allAuthors = Array.from(pubkeysSet).sort();

    // Create a stable sorted list - sort by pubkey only for complete stability
    // This prevents re-ordering when event counts change
    const stableSortedAuthors = allAuthors.slice(0, 15);

    // Build final list with current user first
    const result: string[] = [];

    // Add current user first if they have events
    if (currentUser?.pubkey && stableSortedAuthors.includes(currentUser.pubkey)) {
      result.push(currentUser.pubkey);
    }

    // Add other authors, maintaining the stable alphabetical order
    stableSortedAuthors.forEach(pubkey => {
      if (pubkey !== currentUser?.pubkey) {
        result.push(pubkey);
      }
    });

    return result;
  }, [uniquePubkeysString, currentUser?.pubkey]); // Only depend on the stable string key

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
    estimateSize: () => 120, // Estimated height for each item (increased 50%)
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
        <div className="border-b bg-background/50">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search events, titles, subjects, hashtags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-9 h-9 text-sm border-0 py-6 !ring-0 !outline-0"
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
            
            {/* Author Filter Dropdown */}
            <div className="mt-1.5 mr-1.5">
              <AuthorFilterDropdown
                authors={uniqueAuthors}
                selectedAuthor={selectedAuthor}
                onAuthorSelect={setSelectedAuthor}
                currentUserPubkey={currentUser?.pubkey}
                groupThreads={groupThreads}
                onGroupThreadsChange={setGroupThreads}
              />
            </div>
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