import React from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBrainstormView } from "@/stores/brainstorm-view-store";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BrainstormViewToggleProps {
  className?: string;
}

/**
 * Toggle component for showing/hiding all brainstorm responses vs only moderator-selected ones
 * Only appears in brainstorm mode conversations
 */
export const BrainstormViewToggle: React.FC<BrainstormViewToggleProps> = ({
  className,
}) => {
  const { showNotChosen, toggleShowNotChosen } = useBrainstormView();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleShowNotChosen}
            size="sm"
            variant="ghost"
            className={cn(
              "gap-2 transition-all duration-200",
              "bg-purple-600/10 hover:bg-purple-600/20",
              "text-purple-600 hover:text-purple-700",
              "border border-purple-600/20",
              className
            )}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {showNotChosen ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">All Agents</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Selected Only</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {showNotChosen
              ? "Showing all agent responses"
              : "Showing only moderator-selected responses"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};