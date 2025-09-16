import { useWindowManager } from "@/stores/windowManager";
import { FloatingWindow, DrawerContent } from "./FloatingWindow";
import { WindowTaskbar } from "./WindowTaskbar";
import { AnimatePresence } from "framer-motion";

interface WindowManagerProps {
  onAttach?: (content: DrawerContent) => void;
  onQuote?: (quotedText: string, sourceWindow: DrawerContent) => void;
}

export function WindowManager({ onAttach, onQuote }: WindowManagerProps) {
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

  const handleQuote = (quotedText: string, windowContent: DrawerContent) => {
    if (onQuote) {
      onQuote(quotedText, windowContent);
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
            onQuote={
              onQuote
                ? (quotedText: string) => handleQuote(quotedText, window.content)
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
