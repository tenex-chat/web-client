import React from "react";
import { X, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NostrProfile } from "@/components/common/NostrProfile";
import { useEvent } from "@nostr-dev-kit/ndk-hooks";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import type { NostrEntity } from "@/lib/utils/nostrEntityParser";
import { isEventPointer } from "@/lib/utils/nostrEntityParser";

interface EventPreviewProps {
  entity: NostrEntity;
  onRemove: () => void;
  onEventLoaded?: (pubkey: string) => void;
  className?: string;
}

export function EventPreview({ entity, onRemove, onEventLoaded, className }: EventPreviewProps) {
  // Extract event ID based on entity type
  const eventId = React.useMemo(() => {
    if (entity.type === "note" && typeof entity.data === "string") {
      return entity.data;
    }
    if (entity.type === "nevent" && isEventPointer(entity.data)) {
      return entity.data.id;
    }
    return null;
  }, [entity]);

  // Fetch the event using useEvent hook
  const event = useEvent(eventId || "");
  const isLoading = !event && !!eventId;

  // Notify parent when event is loaded
  React.useEffect(() => {
    if (event && onEventLoaded) {
      onEventLoaded(event.pubkey);
    }
  }, [event, onEventLoaded]);

  if (!eventId) {
    return null;
  }

  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className={cn(
          "flex items-center justify-center p-4 border-b border-border/30",
          className
        )}
      >
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
          <span className="text-sm">Loading event...</span>
        </div>
      </motion.div>
    );
  }

  if (!event) {
    return null;
  }

  // Full content - no truncation
  const displayContent = event.content;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        "border-b border-border/30",
        className
      )}
    >
      <div className="p-3 pb-3">
        <div className="flex items-start gap-3">
          <Link2 className="w-4 h-4 text-muted-foreground mt-1 flex-shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-2">
              Quoting event
            </div>

            <div className={cn(
              "rounded-lg border border-border/50 bg-accent/20 p-3",
              "hover:bg-accent/30 transition-colors"
            )}>
              {/* Author info */}
              <div className="flex items-center gap-2 mb-2">
                <NostrProfile
                  pubkey={event.pubkey}
                  variant="avatar"
                  size="xs"
                  className="flex-shrink-0"
                />
                <NostrProfile
                  pubkey={event.pubkey}
                  variant="name"
                  className="text-sm font-medium"
                />
                <span className="text-xs text-muted-foreground">
                  · {formatDistanceToNow(new Date(event.created_at * 1000), { addSuffix: true })}
                </span>
              </div>

              {/* Content - scrollable if too long */}
              <div className="text-sm text-foreground/90 whitespace-pre-wrap break-words max-h-[200px] overflow-y-auto">
                {displayContent}
              </div>
            </div>
          </div>

          {/* Remove button */}
          <button
            onClick={onRemove}
            className={cn(
              "p-1 rounded-full",
              "hover:bg-destructive/10 hover:text-destructive",
              "transition-colors"
            )}
            title="Remove preview"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}