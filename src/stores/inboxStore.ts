import { create } from "zustand";
import type { NDKSubscription, NDKEvent, NDKFilter } from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk-hooks";
import { deduplicateEventsByETag, sortEventsByTime } from "@/lib/utils/eventDeduplication";

/**
 * Event kinds to include in the inbox
 */
export const INBOX_EVENT_KINDS = [
  1,     // Regular text notes/mentions
  1111,  // Generic replies (including agent responses)
  30023, // Long-form content mentions
  7,     // Reactions that p-tag the user
];

interface InboxStore {
  // State
  events: NDKEvent[];
  lastVisit: number;
  isLoading: boolean;
  subscription: NDKSubscription | null;

  // Derived values
  unreadCount: number;

  // Actions
  initialize: (ndk: NDK, userPubkey: string) => void;
  cleanup: () => void;
  markAsRead: () => void;
  updateLastVisit: (timestamp: number) => void;
}

// Helper to get persisted last visit timestamp
const getPersistedLastVisit = (): number => {
  const stored = localStorage.getItem("last-inbox-visit");
  if (stored) {
    return parseInt(stored, 10);
  }
  return Math.floor(Date.now() / 1000);
};

// Helper to persist last visit timestamp
const persistLastVisit = (timestamp: number): void => {
  localStorage.setItem("last-inbox-visit", timestamp.toString());
};

export const useInboxStore = create<InboxStore>((set, get) => ({
  // Initial state
  events: [],
  lastVisit: getPersistedLastVisit(),
  isLoading: false,
  subscription: null,
  unreadCount: 0,

  // Initialize subscription for a user
  initialize: (ndk: NDK, userPubkey: string) => {
    // Clean up any existing subscription
    const existingSubscription = get().subscription;
    if (existingSubscription) {
      existingSubscription.stop();
    }

    if (!userPubkey || !ndk) {
      set({ events: [], subscription: null, isLoading: false, unreadCount: 0 });
      return;
    }

    set({ isLoading: true });

    // Create filter for events that p-tag the current user
    const filter: NDKFilter = {
      "#p": [userPubkey], // Hex-encoded pubkey
      kinds: INBOX_EVENT_KINDS,
      // Get events from the last 7 days by default
      since: Math.floor(Date.now() / 1000) - (7 * 24 * 60 * 60),
    };

    // Create a single subscription
    const subscription = ndk.subscribe(
      filter,
      {
        closeOnEose: false,
        groupable: false,
        subId: "inbox-events-store"
      }
    );

    // Collect events
    const eventMap = new Map<string, NDKEvent>();

    subscription.on("event", (event: NDKEvent) => {
      // Add to map (automatically handles updates/duplicates)
      eventMap.set(event.id, event);

      // Convert map to array, deduplicate, and sort
      const allEvents = Array.from(eventMap.values());
      const deduplicated = deduplicateEventsByETag(allEvents);
      const sorted = sortEventsByTime(deduplicated);

      // Calculate unread count
      const lastVisit = get().lastVisit;
      const unreadCount = sorted.filter(
        event => event.created_at && event.created_at > lastVisit
      ).length;

      // Update store
      set({
        events: sorted,
        unreadCount,
        isLoading: false
      });
    });

    subscription.on("eose", () => {
      set({ isLoading: false });
    });

    // Save subscription reference
    set({ subscription });
  },

  // Cleanup subscription
  cleanup: () => {
    const subscription = get().subscription;
    if (subscription) {
      subscription.stop();
      set({ subscription: null, events: [], unreadCount: 0 });
    }
  },

  // Mark inbox as read
  markAsRead: () => {
    const now = Math.floor(Date.now() / 1000);
    persistLastVisit(now);

    // Recalculate unread count with new timestamp
    const events = get().events;
    const unreadCount = events.filter(
      event => event.created_at && event.created_at > now
    ).length;

    set({ lastVisit: now, unreadCount });
  },

  // Update last visit timestamp (used when restoring from storage)
  updateLastVisit: (timestamp: number) => {
    persistLastVisit(timestamp);

    // Recalculate unread count with new timestamp
    const events = get().events;
    const unreadCount = events.filter(
      event => event.created_at && event.created_at > timestamp
    ).length;

    set({ lastVisit: timestamp, unreadCount });
  },
}));

// Helper hook to check if an event is unread
export const useIsEventUnread = (event: NDKEvent): boolean => {
  const lastVisit = useInboxStore(state => state.lastVisit);
  return event.created_at ? event.created_at > lastVisit : false;
};