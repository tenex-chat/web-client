import { memo } from "react";
import { cn } from "@/lib/utils";

interface TypingUser {
  pubkey: string;
  name?: string;
}

interface TypingIndicatorProps {
  users: TypingUser[];
  className?: string;
}

export const TypingIndicator = memo(function TypingIndicator({
  users,
  className,
}: TypingIndicatorProps) {
  if (users.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-sm text-muted-foreground",
        className,
      )}
    >
      <span className="text-xs">is typing</span>
      <div className="flex gap-1">
        <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="inline-block w-1.5 h-1.5 bg-muted-foreground/60 rounded-full animate-bounce" />
      </div>
    </div>
  );
});
