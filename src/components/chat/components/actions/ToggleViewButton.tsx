import { Layers, List } from "lucide-react";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { useThreadViewModeStore, type ThreadViewMode } from "@/stores/thread-view-mode-store";

export function ToggleViewButton() {
  const { mode, setMode } = useThreadViewModeStore();

  const handleToggle = () => {
    const newMode: ThreadViewMode = mode === 'threaded' ? 'flattened' : 'threaded';
    setMode(newMode);
  };

  return (
    <DropdownMenuItem onClick={handleToggle} className="cursor-pointer">
      {mode === 'threaded' ? (
        <>
          <List className="w-4 h-4 mr-2" />
          Switch to Flattened View
        </>
      ) : (
        <>
          <Layers className="w-4 h-4 mr-2" />
          Switch to Threaded View
        </>
      )}
    </DropdownMenuItem>
  );
}