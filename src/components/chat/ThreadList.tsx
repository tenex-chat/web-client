import { useSubscribe, useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useMemo, useCallback, memo } from "react";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VirtualList } from "@/components/ui/virtual-list";
import { cn } from "@/lib/utils";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { VIRTUAL_LIST_THRESHOLDS } from "@/lib/constants";
import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { ThreadItem } from "./ThreadItem";

interface ThreadListProps {
  project: NDKProject;
  selectedThread?: NDKEvent;
  onThreadSelect: (thread: NDKEvent) => void;
  className?: string;
  timeFilter?: string | null;
}

export const ThreadList = memo(function ThreadList({
  project,
  selectedThread,
  onThreadSelect,
  className,
  timeFilter,
}: ThreadListProps) {
  const currentUser = useNDKCurrentUser();
  
  // Subscribe to project threads - ONLY THIS, nothing else
  const { events: threadEvents } = useSubscribe(
    project
      ? [
          {
            kinds: [NDKKind.Thread],
            ...project.filter(),
          },
        ]
      : false,
    {},
  );

  // Subscribe to all replies to get last response times
  const { events: allReplies } = useSubscribe(
    project && timeFilter
      ? [
          {
            kinds: [1111], // GenericReply events
            ...project.filter(),
          },
        ]
      : false,
    {},
  );

  // Sort and filter threads based on timeFilter
  const sortedThreads = useMemo(() => {
    if (!threadEvents || threadEvents.length === 0) return [];

    let filteredThreads = [...threadEvents].filter(
      (thread) => thread.created_at !== undefined
    );

    // Apply time filter if set
    if (timeFilter && allReplies) {
      const now = Math.floor(Date.now() / 1000);
      
      // Check if this is a "needs response" filter
      const isNeedsResponseFilter = timeFilter.startsWith("needs-response-");
      
      if (isNeedsResponseFilter && currentUser) {
        // Handle "needs response" filters - shows threads where others have replied but user hasn't
        const filterTime = timeFilter.replace("needs-response-", "");
        const thresholds: Record<string, number> = {
          "1h": 60 * 60,
          "4h": 4 * 60 * 60,
          "1d": 24 * 60 * 60,
        };
        const threshold = thresholds[filterTime];
        
        if (threshold) {
          // Track the last response from others and the user per thread
          const threadLastOtherReplyMap = new Map<string, number>();
          const threadLastUserReplyMap = new Map<string, number>();
          
          // Group replies by thread and categorize by author
          allReplies.forEach(reply => {
            const threadIdTag = reply.tags?.find(tag => tag[0] === 'E');
            if (threadIdTag && threadIdTag[1] && reply.created_at) {
              if (reply.pubkey === currentUser.pubkey) {
                // Track user's own replies
                const currentLast = threadLastUserReplyMap.get(threadIdTag[1]) || 0;
                if (reply.created_at > currentLast) {
                  threadLastUserReplyMap.set(threadIdTag[1], reply.created_at);
                }
              } else {
                // Track replies from others
                const currentLast = threadLastOtherReplyMap.get(threadIdTag[1]) || 0;
                if (reply.created_at > currentLast) {
                  threadLastOtherReplyMap.set(threadIdTag[1], reply.created_at);
                }
              }
            }
          });
          
          // Filter threads that need a response from the current user
          filteredThreads = filteredThreads.filter(thread => {
            const lastOtherReplyTime = threadLastOtherReplyMap.get(thread.id);
            const lastUserReplyTime = threadLastUserReplyMap.get(thread.id);
            
            // If someone else has replied
            if (lastOtherReplyTime) {
              // Check if user has already responded after this reply
              if (lastUserReplyTime && lastUserReplyTime > lastOtherReplyTime) {
                // User has already responded, don't show
                return false;
              }
              
              // Check if the time since the other person's reply exceeds the threshold
              const timeSinceLastOtherReply = now - lastOtherReplyTime;
              if (timeSinceLastOtherReply < threshold) {
                // Reply is still within the threshold time, don't show yet
                return false;
              }
              
              // Someone replied more than threshold ago and user hasn't responded yet
              return true;
            }
            
            // Don't include threads without replies from others
            return false;
          });
        }
      } else {
        // Handle regular activity filters - shows threads with any activity within the time frame
        const thresholds: Record<string, number> = {
          "1h": 60 * 60,
          "4h": 4 * 60 * 60,
          "1d": 24 * 60 * 60,
        };
        const threshold = thresholds[timeFilter];
        
        if (threshold) {
          // Track the last response time per thread (from anyone)
          const threadLastReplyMap = new Map<string, number>();
          
          // Group all replies by thread
          allReplies.forEach(reply => {
            const threadIdTag = reply.tags?.find(tag => tag[0] === 'E');
            if (threadIdTag && threadIdTag[1] && reply.created_at) {
              const currentLast = threadLastReplyMap.get(threadIdTag[1]) || 0;
              if (reply.created_at > currentLast) {
                threadLastReplyMap.set(threadIdTag[1], reply.created_at);
              }
            }
          });
          
          // Filter threads based on last activity time
          filteredThreads = filteredThreads.filter(thread => {
            const lastReplyTime = threadLastReplyMap.get(thread.id);
            
            // If thread has any replies
            if (lastReplyTime) {
              const timeSinceLastReply = now - lastReplyTime;
              // Show threads that have had a reply within the selected timeframe
              return timeSinceLastReply <= threshold;
            }
            
            // Also include threads created within the timeframe (even if no replies yet)
            const timeSinceCreation = now - (thread.created_at || 0);
            return timeSinceCreation <= threshold;
          });
        }
      }
    }

    // Sort by creation time
    return filteredThreads.sort((a, b) => {
      return (b.created_at || 0) - (a.created_at || 0);
    });
  }, [threadEvents, timeFilter, allReplies, currentUser]);

  const renderThread = useCallback(
    (thread: (typeof sortedThreads)[0]) => (
      <ThreadItem
        key={thread.id}
        thread={thread}
        isSelected={thread.id === selectedThread?.id}
        onSelect={() => onThreadSelect(thread)}
      />
    ),
    [selectedThread?.id, onThreadSelect],
  );

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Thread List */}
      {sortedThreads.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground flex-1 flex flex-col items-center justify-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            {timeFilter 
              ? timeFilter.startsWith("needs-response-") 
                ? "No conversations need your response" 
                : "No active conversations"
              : "No conversations yet"}
          </p>
          <p className="text-xs mt-2">
            {(() => {
              if (!timeFilter) {
                return "Start a new thread to begin chatting";
              }
              if (timeFilter.startsWith("needs-response-")) {
                const time = timeFilter.replace("needs-response-", "");
                return `All caught up! No threads waiting for your response longer than ${time === "1h" ? "1 hour" : time === "4h" ? "4 hours" : "24 hours"}`;
              }
              return `No conversations with activity in the last ${timeFilter === "1h" ? "hour" : timeFilter === "4h" ? "4 hours" : "24 hours"}`;
            })()}
          </p>
        </div>
      ) : sortedThreads.length > VIRTUAL_LIST_THRESHOLDS.THREAD_LIST ? (
        // Use VirtualList for large thread lists
        <VirtualList
          items={sortedThreads}
          renderItem={renderThread}
          estimateSize={90} // Estimated average thread item height
          overscan={3}
          containerClassName="flex-1"
        />
      ) : (
        // Use regular ScrollArea for small thread lists
        <ScrollArea className="flex-1">
          <div className="divide-y">{sortedThreads.map(renderThread)}</div>
        </ScrollArea>
      )}
    </div>
  );
});
