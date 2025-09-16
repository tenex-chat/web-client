import { Layers, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useThreadViewModeStore, type ThreadViewMode } from "@/stores/thread-view-mode-store";

interface ThreadViewToggleProps {
  className?: string;
  disabled?: boolean;
}

export function ThreadViewToggle({ className, disabled = false }: ThreadViewToggleProps) {
  const { mode, setMode } = useThreadViewModeStore();

  const toggleMode = () => {
    const newMode: ThreadViewMode = mode === 'threaded' ? 'flattened' : 'threaded';
    setMode(newMode);
  };

  const Icon = mode === 'threaded' ? Layers : List;
  const tooltipText = mode === 'threaded' 
    ? 'Switch to flattened view' 
    : 'Switch to threaded view';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleMode}
            disabled={disabled}
            className={cn(
              "w-8 h-8 sm:w-9 sm:h-9 hover:bg-accent",
              className
            )}
            aria-label={tooltipText}
          >
            <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}