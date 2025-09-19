import { useMemo, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useNDKCurrentPubkey, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { inboxEventsCache, lastInboxVisitAtom, INBOX_EVENT_KINDS } from "@/stores/inbox";

/**
 * Hook to subscribe to and manage inbox events
 * Returns all events where the current user is p-tagged
 */
export function useInboxEvents() {
  const currentPubkey = useNDKCurrentPubkey();
  const [eventsCache, setEventsCache] = useAtom(inboxEventsCache);
  const lastVisit = useAtomValue(lastInboxVisitAtom);

  // Create filter for events that p-tag the current user
  const filter = useMemo(() => {
    if (!currentPubkey) return false;
    
    return [{
      "#p": [currentPubkey], // Hex-encoded pubkey
      kinds: INBOX_EVENT_KINDS,
      // Get events from the last 7 days by default
      since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60),
    }];
  }, [currentPubkey]);

  // Subscribe to events
  const { events } = useSubscribe(
    filter,
    { 
      closeOnEose: false, 
      groupable: false, 
      subId: "inbox-events" 
    },
    [currentPubkey]
  );

  // Update cache when events change
  useEffect(() => {
    if (events.length > 0) {
      setEventsCache(events);
    }
  }, [events, setEventsCache]);

  // Deduplicate events by E tag and sort by timestamp (newest first)
  const sortedEvents = useMemo(() => {
    // Group events by E tag value
    const eventsByETag = new Map<string | null, NDKEvent[]>();
    
    events.forEach(event => {
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

    // Sort all remaining events by creation time (newest first)
    return deduplicatedEvents.sort((a, b) => {
      const timeA = a.created_at || 0;
      const timeB = b.created_at || 0;
      return timeB - timeA;
    });
  }, [events]);

  // Calculate unread count
  const unreadCount = useMemo(() => {
    return sortedEvents.filter(
      event => event.created_at && event.created_at > lastVisit
    ).length;
  }, [sortedEvents, lastVisit]);

  return {
    events: sortedEvents,
    unreadCount,
    loading: false, // NDK doesn't provide loading state for subscriptions
  };
}

/**
 * Hook to get just the unread count for displaying in the sidebar badge
 */
export function useInboxUnreadCount() {
  const currentPubkey = useNDKCurrentPubkey();
  const lastVisit = useAtomValue(lastInboxVisitAtom);

  // Create filter for recent events only (for performance)
  const filter = useMemo(() => {
    if (!currentPubkey) return false;
    
    return [{
      "#p": [currentPubkey],
      kinds: INBOX_EVENT_KINDS,
      // Only get events since last visit for unread count
      since: lastVisit,
    }];
  }, [currentPubkey, lastVisit]);

  // Subscribe to events
  const { events } = useSubscribe(
    filter,
    { 
      closeOnEose: false, 
      groupable: false, 
      subId: "inbox-unread-count" 
    },
    [currentPubkey, lastVisit]
  );

  return events.length;
}