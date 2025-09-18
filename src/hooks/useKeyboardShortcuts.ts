import { useEffect } from "react";

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const isMatch =
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (shortcut.ctrlKey === undefined ||
            event.ctrlKey === shortcut.ctrlKey) &&
          (shortcut.metaKey === undefined ||
            event.metaKey === shortcut.metaKey) &&
          (shortcut.shiftKey === undefined ||
            event.shiftKey === shortcut.shiftKey) &&
          (shortcut.altKey === undefined || event.altKey === shortcut.altKey);

        if (isMatch) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts]);
}

export function useGlobalSearchShortcut(openSearch: () => void) {
  useKeyboardShortcuts([
    {
      key: "g",
      metaKey: true, // Cmd+G on Mac
      handler: openSearch,
    },
    {
      key: "g",
      ctrlKey: true, // Ctrl+G on Windows/Linux
      handler: openSearch,
    },
  ]);
}

export function useInboxShortcut(toggleInbox: () => void) {
  useKeyboardShortcuts([
    {
      key: "i",
      metaKey: true, // Cmd+I on Mac
      handler: toggleInbox,
    },
    {
      key: "i",
      ctrlKey: true, // Ctrl+I on Windows/Linux
      handler: toggleInbox,
    },
  ]);
}
