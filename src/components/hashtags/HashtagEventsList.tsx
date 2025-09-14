import React, { useMemo } from 'react';
import { NDKProject } from '@/lib/ndk-events/NDKProject';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import { useNDK } from '@nostr-dev-kit/ndk-react';
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks';
import { useHashtagRelays } from '@/hooks/useHashtagRelays';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash } from 'lucide-react';
import { HashtagEventItem } from './HashtagEventItem';
import { VirtualList } from '@/components/ui/virtual-list';

interface HashtagEventsListProps {
  project: NDKProject;
  onEventClick?: (event: NDKEvent) => void;
}

export function HashtagEventsList({ project, onEventClick }: HashtagEventsListProps) {
  const { relays, enabled } = useHashtagRelays();
  const { ndk } = useNDK();

  // Get hashtags from project
  const projectHashtags = useMemo(() => {
    return project.hashtags || [];
  }, [project]);

  // Subscribe to events with hashtag filters
  const { events } = useSubscribe(
    enabled && projectHashtags.length > 0 ? [{
      kinds: [NDKKind.Text], // kind:1 text notes
      "#t": projectHashtags.map(tag => tag.toLowerCase().replace(/^#/, '')), // Remove # prefix if present
    }] : false,
    {
      relays, // Use configured hashtag relays
      closeOnEose: false, // Keep subscription open for real-time updates
      groupable: true, // Batch updates for performance
    },
    { 
      enabled: enabled && projectHashtags.length > 0 && relays.length > 0,
    }
  );

  // Sort events by created_at (newest first)
  const sortedEvents = useMemo(() => {
    return Array.from(events).sort((a, b) => {
      const aTime = a.created_at || 0;
      const bTime = b.created_at || 0;
      return bTime - aTime;
    });
  }, [events]);

  // Empty state when no hashtags configured
  if (projectHashtags.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Hash className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold text-sm mb-1">No hashtags configured</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Add hashtags to your project to see related events from Nostr
        </p>
      </div>
    );
  }

  // Empty state when no relays configured
  if (!enabled || relays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Hash className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold text-sm mb-1">Hashtag relays not configured</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Configure relays in settings to see hashtag events
        </p>
      </div>
    );
  }

  // Empty state when no events found (yet)
  if (sortedEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Hash className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h3 className="font-semibold text-sm mb-1">No events found</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Events with hashtags {projectHashtags.map(tag => `#${tag}`).join(', ')} will appear here
        </p>
      </div>
    );
  }

  // Use VirtualList for performance with many events
  if (sortedEvents.length > 50) {
    return (
      <VirtualList
        items={sortedEvents}
        renderItem={(event) => (
          <HashtagEventItem
            key={event.id}
            event={event}
            hashtags={projectHashtags}
            onClick={() => onEventClick?.(event)}
          />
        )}
        getItemKey={(event) => event.id}
        itemHeight={80} // Approximate height of each item
        className="h-full"
      />
    );
  }

  // Regular scrollable list for smaller datasets
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {sortedEvents.map((event) => (
          <HashtagEventItem
            key={event.id}
            event={event}
            hashtags={projectHashtags}
            onClick={() => onEventClick?.(event)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}