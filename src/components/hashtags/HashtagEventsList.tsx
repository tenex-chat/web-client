import * as React from 'react';
import { NDKProject } from '@/lib/ndk-events/NDKProject';
import { NDKEvent, NDKKind } from '@nostr-dev-kit/ndk';
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks';
import { useHashtagRelays } from '@/hooks/useHashtagRelays';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Hash } from 'lucide-react';
import { HashtagEventItem } from './HashtagEventItem';

interface HashtagEventsListProps {
  project: NDKProject;
  onEventClick?: (event: NDKEvent) => void;
}

export function HashtagEventsList({ project, onEventClick }: HashtagEventsListProps) {
  const { relays } = useHashtagRelays();

  // Get hashtags from project
  const projectHashtags = React.useMemo(() => {
    return project.hashtags || [];
  }, [project]);

  // Subscribe to events with hashtag filters
  const { events } = useSubscribe(
    projectHashtags.length > 0 ? [{
      kinds: [NDKKind.Text], // kind:1 text notes
      "#t": projectHashtags.map(tag => tag.toLowerCase().replace(/^#/, '')), // Remove # prefix if present
    }] : [],
    { relayUrls: relays },
    [projectHashtags, relays] // Dependencies array
  );

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
  if (relays.length === 0) {
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
  if (events.length === 0) {
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

  // Use regular scrollable list for all datasets
  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col">
        {events.map((event) => (
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