import React, { memo, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckSquare, Square, User, Clock } from "lucide-react";
import { useNDK, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { NDKKind, NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { formatRelativeTime } from "@/lib/utils/time";
import { cn } from "@/lib/utils";
import type { NDKTask } from "@/lib/ndk-events/NDKTask";
import { NDKProjectStatus } from "@/lib/ndk-events/NDKProjectStatus";
import { logger } from "@/lib/logger";
import { NostrProfile } from "@/components/common/NostrProfile";

interface TaskContentProps {
  task: NDKTask;
  onClick?: () => void;
  showUnread?: boolean;
  unreadCount?: number;
}

/**
 * Task content component that renders inside a MessageShell
 * Provides the task-specific content while MessageShell handles the author/timestamp header
 */
export const TaskContent = memo(function TaskContent({
  task,
  onClick,
  showUnread,
  unreadCount = 0,
}: TaskContentProps) {
  // Subscribe to task updates
  const { events: updates } = useSubscribe(
    [
      {
        kinds: [NDKKind.GenericReply as number, NDKProjectStatus.kind],
        "#e": [task.id],
        limit: 10,
      },
    ],
    { closeOnEose: false, groupable: true },
    [task.id],
  );

  // Get the latest update (for display purposes)
  const latestUpdate = useMemo(() => {
    if (!updates || updates.length === 0) return null;
    return updates.sort((a, b) => {
      const timeDiff = (b.created_at ?? 0) - (a.created_at ?? 0);
      // If timestamps are equal, apply priority rules
      if (timeDiff === 0) {
        const aStatus = a.tagValue("status");
        const bStatus = b.tagValue("status");
        const aHasReasoning = a.hasTag("reasoning");
        const bHasReasoning = b.hasTag("reasoning");

        // Priority 1: Events with "reasoning" tag (show on top)
        if (bHasReasoning && !aHasReasoning) return -1;
        if (aHasReasoning && !bHasReasoning) return 1;

        // Priority 2: Events with "complete" status
        if (bStatus === "complete" && aStatus !== "complete") return 1;
        if (aStatus === "complete" && bStatus !== "complete") return -1;
      }
      return timeDiff;
    })[0];
  }, [updates]);

  // Get current status from the latest update that has a status tag
  const currentStatus = useMemo(() => {
    if (!updates || updates.length === 0) return "pending";

    // Sort updates by timestamp, prioritizing "reasoning" tag and "complete" status for same timestamps
    const sortedUpdates = [...updates].sort((a, b) => {
      const timeDiff = (b.created_at ?? 0) - (a.created_at ?? 0);
      // If timestamps are equal, apply priority rules
      if (timeDiff === 0) {
        const aStatus = a.tagValue("status");
        const bStatus = b.tagValue("status");
        const aHasReasoning = a.hasTag("reasoning");
        const bHasReasoning = b.hasTag("reasoning");

        // Priority 1: Events with "reasoning" tag (show on top)
        if (bHasReasoning && !aHasReasoning) return -1;
        if (aHasReasoning && !bHasReasoning) return 1;

        // Priority 2: Events with "complete" status
        if (bStatus === "complete" && aStatus !== "complete") return 1;
        if (aStatus === "complete" && bStatus !== "complete") return -1;
      }
      return timeDiff;
    });

    for (const update of sortedUpdates) {
      const status = update.tagValue("status");
      if (status) {
        return status;
      }
    }

    // Default to pending if no status found in any update
    return "pending";
  }, [updates]);

  // TODO: Implement proper 24134 stop request with project context
  // For now, removing incorrect 24133 publishing
  const handleAbort = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Functionality temporarily disabled - needs project context for proper 24134 implementation
    logger.warn(
      "Task abort not implemented - needs project context for 24134 stop request",
    );
  };

  return (
    <div
      className={cn(
        "cursor-pointer rounded-lg border border-muted/50 bg-muted/10 p-3 transition-all hover:bg-muted/20 hover:border-muted",
        showUnread && unreadCount > 0 && "ring-1 ring-blue-500/50",
      )}
      onClick={onClick}
    >
      {/* Task Header with icon and title */}
      <div className="flex items-start gap-3 mb-2">
        <div className="mt-0.5">
          <CheckSquare
            className={cn(
              "w-5 h-5",
              currentStatus === "complete"
                ? "text-green-500"
                : currentStatus === "in-progress"
                  ? "text-blue-500"
                  : "text-muted-foreground",
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-base font-semibold text-foreground flex-1">
              {task.title || "Untitled Task"}
            </h4>

            <div className="flex items-center gap-2">
              {currentStatus === "in-progress" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleAbort}
                  className="h-6 px-2 text-xs"
                >
                  <Square className="w-3 h-3 mr-1" />
                  Stop
                </Button>
              )}

              {showUnread && unreadCount > 0 && (
                <Badge variant="default" className="bg-blue-500 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </div>
          </div>

          {/* Show latest update if available */}
          {latestUpdate && (
            <div className="mb-3 p-2.5 border-l-3 border-blue-500/40 bg-blue-50/30 dark:bg-blue-950/10 rounded">
              <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">
                {latestUpdate.content}
              </p>
              {latestUpdate.created_at && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {formatRelativeTime(latestUpdate.created_at)}
                </p>
              )}
            </div>
          )}

          {/* Task metadata - status, assignment, type */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentStatus && (
              <Badge
                variant="secondary"
                className={cn(
                  "text-xs px-2 py-0.5",
                  currentStatus === "complete" &&
                    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  currentStatus === "in-progress" &&
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  currentStatus === "pending" &&
                    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                )}
              >
                {currentStatus === "complete"
                  ? "✓ Completed"
                  : currentStatus === "in-progress"
                    ? "⚡ In Progress"
                    : "⏳ " + currentStatus}
              </Badge>
            )}

            {task.assignedTo && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <NostrProfile
                  pubkey={task.assignedTo}
                  variant="name"
                  size="xs"
                  className="text-muted-foreground"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
