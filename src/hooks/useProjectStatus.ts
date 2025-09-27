import { useEffect, useState } from "react";
import { useSubscribe, useNDK } from "@nostr-dev-kit/ndk-hooks";
import { NDKProjectStatus } from "@/lib/ndk-events/NDKProjectStatus";
import { TIMING } from "@/lib/constants";

interface ProjectStatus {
  isOnline: boolean;
  lastSeen?: Date;
}

export function useProjectStatus(
  projectTagId?: string,
): ProjectStatus | undefined {
  const { ndk } = useNDK();
  const [status, setStatus] = useState<ProjectStatus | undefined>();
  const [userPubkey, setUserPubkey] = useState<string | undefined>();

  // Get current user's pubkey
  useEffect(() => {
    ndk?.signer?.user?.()?.then((u) => setUserPubkey(u?.pubkey));
  }, [ndk]);

  // Subscribe to status events for this project
  const { events } = useSubscribe(
    projectTagId && userPubkey
      ? [
          {
            kinds: [NDKProjectStatus.kind as number],
            "#p": [userPubkey],
            "#a": [projectTagId],
            since:
              Math.floor(Date.now() / 1000) -
              TIMING.PROJECT_STATUS_FILTER_SECONDS,
          },
        ]
      : [],
  );

  useEffect(() => {
    if (!projectTagId) {
      setStatus(undefined);
      return;
    }

    // If no events yet, default to offline
    if (!events || events.length === 0) {
      setStatus({ isOnline: false });
      return;
    }

    // Find the most recent status event for this project
    const statusEvents = events
      .map((event) => NDKProjectStatus.from(event))
      .filter((status) => status.projectId === projectTagId)
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

    if (statusEvents.length > 0) {
      const latestStatus = statusEvents[0];
      setStatus({
        isOnline: latestStatus.isOnline,
        lastSeen: latestStatus.lastSeen,
      });
    } else {
      setStatus({ isOnline: false });
    }
  }, [events, projectTagId]);

  return status;
}
