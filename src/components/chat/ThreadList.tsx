import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { useMemo, useCallback, memo, useState } from "react";
import { MessageSquare, Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
}

export const ThreadList = memo(function ThreadList({
  project,
  selectedThread,
  onThreadSelect,
  className,
}: ThreadListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  
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

  // Sort and filter threads based on search query
  const sortedThreads = useMemo(() => {
    if (!threadEvents || threadEvents.length === 0) return [];

    let filtered = [...threadEvents].filter(
      (thread) => thread.created_at !== undefined
    );

    // Filter by search query if present
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((thread) => {
        // Search in thread content
        const content = thread.content?.toLowerCase() || "";
        // Search in thread tags (like title tag)
        const title = thread.tagValue("title")?.toLowerCase() || "";
        // Search in thread summary
        const summary = thread.tagValue("summary")?.toLowerCase() || "";
        
        return (
          content.includes(query) ||
          title.includes(query) ||
          summary.includes(query)
        );
      });
    }

    // Sort by creation time (newest first)
    return filtered.sort((a, b) => {
      return (b.created_at || 0) - (a.created_at || 0);
    });
  }, [threadEvents, searchQuery]);

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
      {/* Search Input */}
      <div className="p-2 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      {/* Thread List */}
      {sortedThreads.length === 0 ? (
        <div className="p-4 text-center text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-sm">
            {searchQuery
              ? "No conversations match your search"
              : "No conversations yet"}
          </p>
          <p className="text-xs mt-2">
            {searchQuery
              ? "Try a different search term"
              : "Start a new thread to begin chatting"}
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
