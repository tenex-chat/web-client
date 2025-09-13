import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { MessageSquare, ChevronRight, Hash } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/time";
import { NostrProfile } from "@/components/common/NostrProfile";
import { Badge } from "@/components/ui/badge";

interface ChatMessageEmbedCardProps {
  event: NDKEvent;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export function ChatMessageEmbedCard({
  event,
  compact,
  className,
  onClick,
}: ChatMessageEmbedCardProps) {
  // Get thread title from 'title' tag if available
  const getThreadTitle = () => {
    const titleTag = event.tags?.find((tag) => tag[0] === "title");
    return titleTag?.[1] || null;
  };

  // Get thread tags (t tags)
  const getThreadTags = () => {
    return (
      event.tags?.filter((tag) => tag[0] === "t").map((tag) => tag[1]) || []
    );
  };

  // Get first line of content for preview
  const getPreview = () => {
    if (!event.content) return "No content";
    const firstLine = event.content.split("\n")[0];
    const maxLength = compact ? 50 : 100;
    if (firstLine.length > maxLength) {
      return firstLine.substring(0, maxLength) + "...";
    }
    return firstLine;
  };

  const title = getThreadTitle();
  const preview = getPreview();
  const tags = getThreadTags();

  if (compact) {
    return (
      <span
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "bg-muted/50 hover:bg-muted transition-colors cursor-pointer",
          "text-sm my-1",
          className,
        )}
      >
        <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
        <span className="font-medium truncate max-w-[200px]">
          {title || preview}
        </span>
      </span>
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "my-3 p-4 cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/20",
        "bg-gradient-to-r from-blue-500/5 to-transparent",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <MessageSquare className="w-5 h-5 text-blue-500" />
        </div>

        <div className="flex-1 min-w-0">
          {title && <h3 className="font-semibold text-base mb-1">{title}</h3>}

          <div className="flex items-center gap-2 mb-2">
            <NostrProfile
              pubkey={event.pubkey}
              size="sm"
              variant="full"
              avatarClassName="h-6 w-6"
              nameClassName="text-sm font-medium"
            />
            {event.created_at && (
              <span className="text-xs text-muted-foreground">
                • {formatRelativeTime(event.created_at * 1000)}
              </span>
            )}
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2">
            {preview}
          </p>

          {tags.length > 0 && (
            <div className="flex items-center gap-1 mt-2 mb-2">
              {tags.slice(0, 3).map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="text-xs h-5 px-1.5"
                >
                  <Hash className="w-2.5 h-2.5 mr-0.5" />
                  {tag}
                </Badge>
              ))}
              {tags.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
              Open thread in conversation
              <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
