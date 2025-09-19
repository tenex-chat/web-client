import { useEffect } from "react";
import { useNDK, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useProjectsStore } from "@/stores/projects";
import { logger } from "@/lib/logger";

/**
 * Hook that initializes project subscriptions when a user is authenticated
 */
export function useProjectSubscriptions() {
  const { ndk } = useNDK();
  const currentUser = useNDKCurrentUser();

  useEffect(() => {
    if (!ndk || !currentUser?.pubkey) return;

    logger.debug(
      "[useProjectSubscriptions] Initializing subscriptions for user:",
      currentUser.pubkey,
    );

    // Initialize project subscriptions
    useProjectsStore
      .getState()
      .initializeSubscriptions(ndk, currentUser.pubkey);

    // Cleanup on unmount or when user changes
    return () => {
      logger.debug("[useProjectSubscriptions] Cleaning up subscriptions");
      useProjectsStore.getState().cleanupSubscriptions();
    };
  }, [ndk, currentUser?.pubkey]);
}
