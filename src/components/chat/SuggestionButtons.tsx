import { memo, useCallback } from "react";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, Sparkles } from "lucide-react";

interface SuggestionButtonsProps {
  event: NDKEvent;
  onSuggestionClick: (suggestion: string, index: number) => void;
  className?: string;
  isMobile?: boolean;
}

/**
 * Component to render suggestion tags from Nostr events as interactive buttons
 * Used for presenting multiple-choice options from the Ask tool
 */
export const SuggestionButtons = memo(function SuggestionButtons({
  event,
  onSuggestionClick,
  className,
  isMobile = false,
}: SuggestionButtonsProps) {
  // Extract suggestion tags from the event
  const suggestions = event.tags
    ?.filter((tag) => tag[0] === "suggestion")
    ?.map((tag) => tag[1])
    ?.filter(Boolean) || [];

  const handleClick = useCallback((suggestion: string, index: number) => {
    onSuggestionClick(suggestion, index);
  }, [onSuggestionClick]);

  // Don't render if no suggestions
  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2 mt-3 p-3 bg-muted/30 rounded-lg border border-border/50",
        isMobile && "gap-1.5 p-2",
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1 w-full">
        <Sparkles className="h-3 w-3" />
        <span>Suggested responses:</span>
      </div>
      {suggestions.map((suggestion, index) => (
        <Button
          key={`${event.id}-suggestion-${index}`}
          variant="outline"
          size={isMobile ? "sm" : "default"}
          onClick={() => handleClick(suggestion, index)}
          className={cn(
            "group relative transition-all hover:bg-primary/10 hover:border-primary",
            "flex items-center gap-2",
            isMobile && "text-xs px-2.5 py-1.5 h-auto"
          )}
        >
          <span className="flex-1 text-left">{suggestion}</span>
          <ArrowRight className={cn(
            "h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity",
            "group-hover:translate-x-0.5 transition-transform"
          )} />
        </Button>
      ))}
    </div>
  );
});