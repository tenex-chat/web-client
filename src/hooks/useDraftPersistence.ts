import { useEffect, useCallback, useMemo } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { TIMING } from "@/lib/constants";

// Atom to store drafts per thread/task
// Key format: 'thread:{threadId}' or 'task:{taskId}'
const messageDraftsAtom = atomWithStorage<Map<string, string>>(
  "message-drafts",
  new Map(),
  {
    getItem: (key: string) => {
      const stored = localStorage.getItem(key);
      if (!stored) return new Map();
      try {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      } catch {
        return new Map();
      }
    },
    setItem: (key: string, value: Map<string, string>) => {
      const obj = Object.fromEntries(value);
      localStorage.setItem(key, JSON.stringify(obj));
    },
    removeItem: (key: string) => localStorage.removeItem(key),
  },
);

interface UseDraftPersistenceProps {
  threadId?: string;
  taskId?: string;
  enabled?: boolean;
}

/**
 * Hook to persist message drafts in localStorage
 * Automatically saves and restores drafts per thread/task
 */
export function useDraftPersistence({
  threadId,
  taskId,
  enabled = true,
}: UseDraftPersistenceProps) {
  const [drafts, setDrafts] = useAtom(messageDraftsAtom);

  // Generate a unique key for this draft
  const draftKey = threadId
    ? `thread:${threadId}`
    : taskId
      ? `task:${taskId}`
      : null;

  // Save a draft
  const saveDraft = useCallback(
    (content: string) => {
      if (!draftKey || !enabled) return;

      setDrafts((prev) => {
        const newDrafts = new Map(prev);
        if (content.trim()) {
          newDrafts.set(draftKey, content);
        } else {
          // Remove empty drafts
          newDrafts.delete(draftKey);
        }
        return newDrafts;
      });
    },
    [draftKey, enabled, setDrafts],
  );

  // Clear the draft
  const clearDraft = useCallback(() => {
    if (!draftKey || !enabled) return;

    setDrafts((prev) => {
      const newDrafts = new Map(prev);
      newDrafts.delete(draftKey);
      return newDrafts;
    });
  }, [draftKey, enabled, setDrafts]);

  // Auto-save draft on unmount if there's content
  useEffect(() => {
    return () => {
      // Cleanup is handled by the component using this hook
      // They should call saveDraft on unmount if needed
    };
  }, []);

  // Clean up old drafts (older than 7 days)
  useEffect(() => {
    if (!enabled) return;

    const cleanupOldDrafts = () => {
      const sevenDaysAgo = Date.now() - TIMING.DRAFT_CLEANUP_DURATION;
      const draftTimestamps = localStorage.getItem("draft-timestamps");

      if (!draftTimestamps) return;

      try {
        const timestamps = JSON.parse(draftTimestamps) as Record<
          string,
          number
        >;
        const keysToRemove: string[] = [];

        for (const [key, timestamp] of Object.entries(timestamps)) {
          if (timestamp < sevenDaysAgo) {
            keysToRemove.push(key);
          }
        }

        if (keysToRemove.length > 0) {
          setDrafts((prev) => {
            const newDrafts = new Map(prev);
            keysToRemove.forEach((key) => newDrafts.delete(key));
            return newDrafts;
          });

          // Update timestamps
          const newTimestamps = { ...timestamps };
          keysToRemove.forEach((key) => delete newTimestamps[key]);
          localStorage.setItem(
            "draft-timestamps",
            JSON.stringify(newTimestamps),
          );
        }
      } catch {
        // Ignore errors in cleanup
      }
    };

    // Run cleanup on mount
    cleanupOldDrafts();
  }, [enabled, setDrafts]);

  // Update timestamp when draft is saved
  const updateTimestamp = useCallback(() => {
    if (!draftKey) return;

    try {
      const timestamps = JSON.parse(
        localStorage.getItem("draft-timestamps") || "{}",
      );
      timestamps[draftKey] = Date.now();
      localStorage.setItem("draft-timestamps", JSON.stringify(timestamps));
    } catch {
      // Ignore errors
    }
  }, [draftKey]);

  // Enhanced saveDraft that also updates timestamp
  const saveDraftWithTimestamp = useCallback(
    (content: string) => {
      saveDraft(content);
      if (content.trim()) {
        updateTimestamp();
      }
    },
    [saveDraft, updateTimestamp],
  );

  // Use useMemo to ensure draft is recalculated when key changes
  const currentDraft = useMemo(() => {
    if (!draftKey || !enabled) return "";
    return drafts.get(draftKey) || "";
  }, [draftKey, drafts, enabled]);

  return {
    draft: currentDraft,
    saveDraft: saveDraftWithTimestamp,
    clearDraft,
  };
}
