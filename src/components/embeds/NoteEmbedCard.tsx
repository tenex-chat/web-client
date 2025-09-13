import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { MessageSquare, Heart, Repeat2, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/time";
import { NostrProfile } from "@/components/common/NostrProfile";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BaseEmbedCard } from "./BaseEmbedCard";

interface NoteEmbedCardProps {
  event: NDKEvent;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}

export function NoteEmbedCard({
  event,
  compact,
  className,
  onClick,
}: NoteEmbedCardProps) {
  const getImageUrl = () => {
    const urlTag = event.tags?.find(
      (tag) => tag[0] === "url" || tag[0] === "image",
    );
    if (urlTag) return urlTag[1];

    const imageMatch = event.content?.match(
      /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|svg))/i,
    );
    return imageMatch?.[0];
  };

  const imageUrl = getImageUrl();
  const contentWithoutImage = imageUrl
    ? event.content?.replace(imageUrl, "").trim()
    : event.content;

  if (compact) {
    return (
      <BaseEmbedCard
        event={event}
        compact={true}
        className={className}
        onClick={onClick}
        icon={<MessageSquare className="w-3.5 h-3.5" />}
        title={`Note by ${event.pubkey.slice(0, 8)}...`}
      />
    );
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        "my-3 p-4 cursor-pointer transition-all",
        "hover:shadow-md hover:border-primary/20",
        className,
      )}
    >
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback>
            {event.pubkey.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <NostrProfile pubkey={event.pubkey} />
            <span className="text-xs text-muted-foreground">
              {event.created_at && formatRelativeTime(event.created_at * 1000)}
            </span>
          </div>

          {contentWithoutImage && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {contentWithoutImage.length > 280
                  ? contentWithoutImage.slice(0, 280) + "..."
                  : contentWithoutImage}
              </ReactMarkdown>
            </div>
          )}

          {imageUrl && (
            <div className="mt-3 rounded-lg overflow-hidden bg-muted">
              <img
                src={imageUrl}
                alt="Note attachment"
                className="max-w-full max-h-64 object-contain"
                loading="lazy"
              />
            </div>
          )}

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Repeat2 className="w-3.5 h-3.5" />
              <span>Repost</span>
            </button>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Heart className="w-3.5 h-3.5" />
              <span>Like</span>
            </button>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Zap className="w-3.5 h-3.5" />
              <span>Zap</span>
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}
