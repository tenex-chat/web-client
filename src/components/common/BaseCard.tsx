import React from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface BaseCardProps {
  onClick?: () => void;
  className?: string;
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  description?: React.ReactNode;
  badges?: React.ReactNode[];
  metadata?: React.ReactNode;
  footer?: React.ReactNode;
  rightContent?: React.ReactNode;
}

export function BaseCard({
  onClick,
  className,
  icon,
  avatar,
  title,
  subtitle,
  description,
  badges,
  metadata,
  footer,
  rightContent,
}: BaseCardProps) {
  return (
    <Card
      className={cn(
        "p-4 transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:scale-[1.01]",
        className,
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {(icon || avatar) && (
          <div className="flex-shrink-0">
            {avatar || (
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                {icon}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-base truncate">{title}</h3>
                {badges && (
                  <div className="flex gap-1 flex-shrink-0">
                    {badges.map((badge, i) => (
                      <React.Fragment key={i}>{badge}</React.Fragment>
                    ))}
                  </div>
                )}
              </div>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            {rightContent}
          </div>

          {description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {description}
            </p>
          )}

          {metadata && (
            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              {metadata}
            </div>
          )}

          {footer}
        </div>
      </div>
    </Card>
  );
}
