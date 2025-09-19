import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

/**
 * Groups events by their E tag and deduplicates them
 * For events with the same E tag, only the most recent one is kept
 * Events without E tags are all included
 *
 * @param events Array of NDK events to deduplicate
 * @returns Deduplicated array of events
 */
export function deduplicateEventsByETag(events: NDKEvent[]): NDKEvent[] {
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

  return deduplicatedEvents;
}

/**
 * Sorts events by creation time (newest first)
 */
export function sortEventsByTime(events: NDKEvent[], ascending = false): NDKEvent[] {
  return [...events].sort((a, b) => {
    const timeA = a.created_at || 0;
    const timeB = b.created_at || 0;
    return ascending ? timeA - timeB : timeB - timeA;
  });
}