import { useWindowManager } from "@/stores/windowManager";
import { FloatingWindow, DrawerContent } from "./FloatingWindow";
import { WindowTaskbar } from "./WindowTaskbar";
import { AnimatePresence } from "framer-motion";

interface WindowManagerProps {
  onAttach?: (content: DrawerContent) => void;
}

export function WindowManager({ onAttach }: WindowManagerProps) {
  const {
    windows,
    removeWindow,
    minimizeWindow,
    restoreWindow,
    focusWindow,
    attachToDrawer,
    updateWindowContent,
  } = useWindowManager();

  const handleAttach = (windowId: string) => {
    if (onAttach) {
      attachToDrawer(windowId, onAttach);
    }
  };

  return (
    <>
      {/* Floating Windows */}
      <AnimatePresence>
        {Array.from(windows.values()).map((window) => (
          <FloatingWindow
            key={window.id}
            content={window.content}
            onClose={() => removeWindow(window.id)}
            onMinimize={() => minimizeWindow(window.id)}
            onFocus={() => focusWindow(window.id)}
            onAttach={
              onAttach
                ? () => handleAttach(window.id)
                : undefined
            }
            onContentUpdate={(newContent) => updateWindowContent(window.id, newContent)}
            isMinimized={window.isMinimized}
            zIndex={window.zIndex}
            initialPosition={window.position}
          />
        ))}
      </AnimatePresence>

      {/* Taskbar for minimized windows */}
      {windows.size > 0 && (
        <WindowTaskbar
          windows={Array.from(windows.values())}
          onRestore={restoreWindow}
          onClose={removeWindow}
        />
      )}
    </>
  );
}
