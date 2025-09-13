import React from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils/time";

export interface BaseEmbedCardProps {
  event: NDKEvent;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  description?: string;
  metadata?: React.ReactNode;
  badges?: React.ReactNode;
  iconClassName?: string;
}

export function BaseEmbedCard({
  event,
  compact = false,
  className,
  onClick,
  icon,
  title,
  subtitle,
  description,
  metadata,
  badges,
  iconClassName,
}: BaseEmbedCardProps) {
  if (compact) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
          "bg-muted/50 hover:bg-muted transition-colors cursor-pointer",
          "text-sm my-1",
          className,
        )}
        onClick={onClick}
      >
        <span className={iconClassName}>{icon}</span>
        <span className="font-medium truncate max-w-[200px]">{title}</span>
        {badges}
      </span>
    );
  }

  return (
    <Card
      className={cn(
        "p-4 hover:shadow-md transition-all cursor-pointer",
        "hover:scale-[1.01]",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        <div className={cn("flex-shrink-0", iconClassName)}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-tight truncate">
                {title}
              </h3>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {badges && <div className="flex gap-1 flex-shrink-0">{badges}</div>}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
            <span>{formatRelativeTime(event.created_at!)}</span>
            {metadata}
          </div>
        </div>
      </div>
    </Card>
  );
}
