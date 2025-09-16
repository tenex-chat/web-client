import { useMemo } from "react";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { parseKind24133 } from "@/lib/ndk-events/operations";

/**
 * Hook for checking operation status of any event
 * Subscribes to 24133 events for specific project and tracks specific event
 */
export function useEventOperationStatus(eventId: string, projectId: string) {
  // Subscribe to kind 24133 with exact filter for this project
  // Only subscribe if we have valid IDs
  const { events } = useSubscribe(
    eventId && projectId
      ? [
          {
            kinds: [24133],
            "#a": [projectId],
            "#e": [eventId],
            limit: 0, // Live-only telemetry as per requirements
          },
        ]
      : false,
    { closeOnEose: false },
  );

  // Process events and track status for our specific eventId
  const { isActive, agentCount } = useMemo(() => {
    if (!events) {
      return { isActive: false, agentCount: 0 };
    }

    let latestSnapshot: any = null;
    let latestCreatedAt = 0;

    // Process all events and find the latest snapshot for our eventId
    events.forEach((event) => {
      const snapshot = parseKind24133(event);
      if (!snapshot || snapshot.eId !== eventId) return;
      if (snapshot.projectId !== projectId) return;

      // Last-write-wins logic
      if (snapshot.createdAt > latestCreatedAt) {
        latestSnapshot = snapshot;
        latestCreatedAt = snapshot.createdAt;
      } else if (
        snapshot.createdAt === latestCreatedAt &&
        snapshot.eventId > (latestSnapshot?.eventId || "")
      ) {
        latestSnapshot = snapshot;
      }
    });

    if (!latestSnapshot) {
      return { isActive: false, agentCount: 0 };
    }

    const hasAgents = latestSnapshot.agentPubkeys.length > 0;

    return {
      isActive: hasAgents,
      agentCount: latestSnapshot.agentPubkeys.length,
    };
  }, [events, eventId, projectId]);

  // Also provide hasActiveOperations alias for backward compatibility
  return { isActive, agentCount, hasActiveOperations: isActive };
}
