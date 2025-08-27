import { useMemo } from "react";
import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { NDKArticle, NDKKind } from "@nostr-dev-kit/ndk";
import { formatRelativeTime } from "@/lib/utils/time";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, User, Hash } from "lucide-react";

interface ChangelogTabContentProps {
  article: NDKArticle;
}

export function ChangelogTabContent({ article }: ChangelogTabContentProps) {
  // Subscribe to changelog events
  const { events: changelogEvents } = useSubscribe(
    article
      ? [
          {
            kinds: [NDKKind.GenericReply],
            "#A": [article.tagId()], // Uppercase #A tag referencing the article
          },
        ]
      : false,
    undefined,
    [article.id],
  );

  // Sort events by created_at timestamp (newest first)
  const sortedEvents = useMemo(() => {
    if (!changelogEvents) return [];
    return [...changelogEvents].sort(
      (a, b) => (b.created_at || 0) - (a.created_at || 0),
    );
  }, [changelogEvents]);

  if (!sortedEvents.length) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No changelog entries yet</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Document Changelog</h2>
          <p className="text-muted-foreground">
            History of changes and updates to this specification document
          </p>
        </div>

        {/* Changelog Entries */}
        <div className="space-y-6">
          {sortedEvents.map((event) => {
            // Extract version tag if present (looking for #v or #version tags)
            const versionTag = event.tags.find(
              (tag) =>
                tag[0] === "t" &&
                (tag[1].startsWith("v") || tag[1] === "version"),
            )?.[1];

            // Extract any other topic tags
            const topicTags = event.tags
              .filter((tag) => tag[0] === "t" && tag[1] !== versionTag)
              .map((tag) => tag[1]);

            return (
              <div
                key={event.id}
                className="border rounded-lg p-6 space-y-4 hover:bg-muted/50 transition-colors"
              >
                {/* Entry Header */}
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    {versionTag && (
                      <Badge variant="default" className="mb-2">
                        {versionTag}
                      </Badge>
                    )}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatRelativeTime(event.created_at || 0)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        <span>{event.pubkey.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Entry Content */}
                <div className="prose prose-neutral dark:prose-invert max-w-none">
                  <p className="whitespace-pre-wrap">{event.content}</p>
                </div>

                {/* Topic Tags */}
                {topicTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {topicTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        <Hash className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );
}
