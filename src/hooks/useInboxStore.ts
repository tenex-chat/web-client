import { useEffect } from "react";
import { useNDK, useNDKCurrentPubkey } from "@nostr-dev-kit/ndk-hooks";
import { useInboxStore, useIsEventUnread } from "@/stores/inboxStore";

/**
 * Hook to initialize and manage the inbox store subscription
 * This should be called once at the app level to ensure a single subscription
 */
export function useInboxStoreInitializer() {
  const { ndk } = useNDK();
  const currentPubkey = useNDKCurrentPubkey();
  const initialize = useInboxStore(state => state.initialize);
  const cleanup = useInboxStore(state => state.cleanup);

  useEffect(() => {
    if (ndk && currentPubkey) {
      // Initialize the inbox store with NDK and the current user's pubkey
      initialize(ndk, currentPubkey);

      // Cleanup on unmount or when pubkey changes
      return () => {
        cleanup();
      };
    } else if (!currentPubkey) {
      // No user logged in, cleanup any existing subscription
      cleanup();
    }
  }, [ndk, currentPubkey, initialize, cleanup]);
}

/**
 * Hook to get inbox events and unread count
 * This is the main hook components should use to access inbox data
 */
export function useInbox() {
  const events = useInboxStore(state => state.events);
  const unreadCount = useInboxStore(state => state.unreadCount);
  const isLoading = useInboxStore(state => state.isLoading);
  const lastVisit = useInboxStore(state => state.lastVisit);
  const markAsRead = useInboxStore(state => state.markAsRead);

  return {
    events,
    unreadCount,
    isLoading,
    lastVisit,
    markAsRead,
  };
}

/**
 * Hook to get just the unread count for displaying badges
 */
export function useInboxUnreadCount() {
  return useInboxStore(state => state.unreadCount);
}

// Re-export the event unread check hook
export { useIsEventUnread };