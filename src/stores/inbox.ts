import { atomWithStorage } from "jotai/utils";
import { atom } from "jotai";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

/**
 * Store for managing inbox state and unread count
 */

// Store the timestamp of when the user last viewed the inbox
export const lastInboxVisitAtom = atomWithStorage<number>(
  "last-inbox-visit",
  Math.floor(Date.now() / 1000),
);

// Cache of recent inbox events for quick access
export const inboxEventsCache = atom<NDKEvent[]>([]);

// Derived atom for unread count based on events newer than last visit
export const unreadInboxCountAtom = atom((get) => {
  const lastVisit = get(lastInboxVisitAtom);
  const events = get(inboxEventsCache);
  
  // Count events created after last visit
  return events.filter(
    (event) => event.created_at && event.created_at > lastVisit
  ).length;
});

// Mark inbox as read by updating the last visit timestamp
export const markInboxAsReadAtom = atom(
  null,
  (_get, set) => {
    set(lastInboxVisitAtom, Math.floor(Date.now() / 1000));
  }
);

// Helper to check if an event is unread
export const isEventUnread = (event: NDKEvent, lastVisit: number): boolean => {
  return event.created_at ? event.created_at > lastVisit : false;
};

// Event kinds to include in the inbox
export const INBOX_EVENT_KINDS = [
  1,     // Regular text notes/mentions
  1111,  // Generic replies (including agent responses)
  30023, // Long-form content mentions
  7,     // Reactions that p-tag the user
];