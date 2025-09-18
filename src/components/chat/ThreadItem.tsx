import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useMemo, memo } from "react";
import { MessageSquare, ChevronRight, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PhaseIndicator } from "@/components/ui/phase-indicator";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/time";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useConversationMetadata } from "@/hooks/useConversationMetadata";

/**
 * Generate a deterministic color hue based on hashtag string
 * Returns a hue value between 0-360 for HSL color
 */
function getHashtagColor(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Convert to positive number and map to 0-360 range
  return Math.abs(hash) % 360;
}

interface ThreadItemProps {
  thread: NDKEvent;
  isSelected: boolean;
  onSelect: () => void;
}

export const ThreadItem = memo(
  function ThreadItem({ thread, isSelected, onSelect }: ThreadItemProps) {
    // Subscribe to metadata updates for this conversation
    const metadata = useConversationMetadata(thread.id);

    // Memoize extracted data from thread
    const { title, tTags } = useMemo(() => {
      const titleTag = thread.tags.find((t) => t[0] === "title");
      const fallbackTitle = titleTag
        ? titleTag[1]
        : thread.content.split("\n")[0].slice(0, 50);

      // Use metadata title if available, otherwise use fallback
      return {
        title: metadata?.title || fallbackTitle,
        tTags: thread.tags.filter((t) => t[0] === "t").map((t) => t[1]),
      };
    }, [thread.tags, thread.content, metadata?.title]);

    // Subscribe to replies for this specific thread
    const { events: replies } = useSubscribe(
      [{ "#E": [thread.id] }],
      {
        closeOnEose: false,
        groupable: true,
      },
      [thread.id],
    );

    // Process replies and extract phase information with memoization
    const processedReplyData = useMemo(() => {
      if (!replies || replies.length === 0) {
        return {
          replyCount: 0,
          participants: new Set([thread.pubkey]),
          lastReplyAt: undefined,
          lastMessage: undefined,
          currentPhase: undefined,
        };
      }

      const uniqueParticipants = new Set([thread.pubkey]);
      let latestReplyTime = 0;
      let latestReplyContent = "";
      let latestPhaseTime = 0;
      let latestPhase = "";

      // Count only kind 1111 (GenericReply) and 1934 (Task) events as replies
      let replyCount = 0;

      replies.forEach((reply) => {
        // Only count kinds 1111 and 1934 for the reply count
        if (reply.kind === 1111 || reply.kind === 1934) {
          replyCount++;
          uniqueParticipants.add(reply.pubkey);
        }

        if (reply.created_at) {
          const replyTime = reply.created_at;
          if (replyTime > latestReplyTime) {
            latestReplyTime = replyTime;
            latestReplyContent = reply.content;
          }

          // Check for phase tags in this reply (from any event kind)
          const phaseTag = reply.tags.find((t) => t[0] === "phase");
          if (phaseTag && phaseTag[1] && replyTime > latestPhaseTime) {
            latestPhaseTime = replyTime;
            latestPhase = phaseTag[1];
          }
        }
      });

      return {
        replyCount: replyCount,
        participants: uniqueParticipants,
        lastReplyAt: latestReplyTime > 0 ? latestReplyTime : undefined,
        lastMessage: latestReplyTime > 0 ? latestReplyContent : undefined,
        currentPhase: latestPhase || undefined,
      };
    }, [replies, thread.pubkey]);

    // Use processed data instead of state
    const { replyCount, participants, lastReplyAt, lastMessage, currentPhase } =
      processedReplyData;

    const lastActivityTime = lastReplyAt ?? thread.created_at;

    return (
      <button
        onClick={onSelect}
        className={cn(
          "w-full text-left p-3 hover:bg-accent/50 transition-colors border-b",
          isSelected && "bg-accent",
        )}
      >
        <div className="flex items-start gap-2.5">
          {/* Phase Indicator */}
          <div className="shrink-0 pt-2">
            <PhaseIndicator phase={currentPhase} className="w-2 h-2" />
          </div>

          {/* Thread Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-normal truncate">{title}</h3>
              {lastActivityTime && (
                <span className="text-xs text-muted-foreground shrink-0">
                  {formatRelativeTime(lastActivityTime)}
                </span>
              )}
            </div>

            <p className="text-sm text-muted-foreground truncate mt-1">
              {lastMessage || thread.content}
            </p>

            {/* Thread Meta - Combined reply/agent counters and hashtags */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {replyCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {replyCount}
                </Badge>
              )}

              {participants.size > 1 && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  <Users className="h-3 w-3 mr-1" />
                  {participants.size}
                </Badge>
              )}

              {/* T-tags display - now inline with counters */}
              {tTags.length > 0 && tTags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="text-xs px-1.5 py-0 h-4"
                  style={{
                    backgroundColor: `hsl(${getHashtagColor(tag)}, 70%, 50%, 0.15)`,
                    borderColor: `hsl(${getHashtagColor(tag)}, 70%, 50%, 0.4)`,
                    color: `hsl(${getHashtagColor(tag)}, 70%, 50%)`,
                  }}
                >
                  #{tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Selection Indicator */}
          {isSelected && (
            <ChevronRight className="h-4 w-4 text-primary shrink-0 mt-1" />
          )}
        </div>
      </button>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.thread.id === nextProps.thread.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.thread.created_at === nextProps.thread.created_at
    );
  },
);
