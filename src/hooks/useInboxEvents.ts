import { useMemo, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useNDKCurrentPubkey, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { inboxEventsCache, lastInboxVisitAtom, INBOX_EVENT_KINDS } from "@/stores/inbox";
import { deduplicateEventsByETag, sortEventsByTime } from "@/lib/utils/eventDeduplication";

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
    const deduplicated = deduplicateEventsByETag(events);
    return sortEventsByTime(deduplicated);
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