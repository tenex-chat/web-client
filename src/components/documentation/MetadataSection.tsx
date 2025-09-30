import { Calendar, Clock, User, Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils/time";

interface MetadataSectionProps {
  authorName: string;
  authorAvatar?: string;
  createdAt: number;
  readingTime: string;
  tags: string[];
  summary?: string;
}

export function MetadataSection({
  authorName,
  authorAvatar,
  createdAt,
  readingTime,
  tags,
  summary,
}: MetadataSectionProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={authorAvatar} alt={authorName} />
            <AvatarFallback>
              <User className="h-3 w-3" />
            </AvatarFallback>
          </Avatar>
          <span>{authorName}</span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>{formatRelativeTime(createdAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>{readingTime}</span>
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              <Hash className="h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {summary && (
        <div className="mb-8 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-2">Summary</p>
          <p className="text-sm text-muted-foreground">{summary}</p>
        </div>
      )}
    </>
  );
}