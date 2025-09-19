import { cn } from "@/lib/utils";

interface ChatHeaderProjectInfoProps {
  projectTitle?: string;
  parentEventId?: string;
  onNavigateToParent?: (parentId: string) => void;
  isMobile: boolean;
}

/**
 * Component responsible for displaying project information and parent navigation
 * Single responsibility: Project metadata display
 */
export function ChatHeaderProjectInfo({
  projectTitle,
  parentEventId,
  onNavigateToParent,
  isMobile,
}: ChatHeaderProjectInfoProps) {
  if (!projectTitle && !parentEventId) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 flex-1">
      {projectTitle && (
        <p
          className={cn(
            "text-muted-foreground",
            isMobile ? "text-[10px] mt-0" : "text-xs mt-0.5",
          )}
        >
          {projectTitle}
        </p>
      )}
      {parentEventId && onNavigateToParent && (
        <button
          onClick={() => onNavigateToParent(parentEventId)}
          className="text-xs text-primary hover:underline cursor-pointer"
        >
          Go to parent
        </button>
      )}
    </div>
  );
}