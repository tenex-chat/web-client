import { useWindowManager } from '@/stores/windowManager'
import { FloatingWindow } from './FloatingWindow'
import { WindowTaskbar } from './WindowTaskbar'
import { AnimatePresence } from 'framer-motion'

export function WindowManager() {
  const { 
    windows, 
    removeWindow, 
    minimizeWindow, 
    restoreWindow,
    focusWindow 
  } = useWindowManager()
  
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
  )
}