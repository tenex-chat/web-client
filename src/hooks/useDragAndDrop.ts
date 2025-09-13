import {
  useState,
  useCallback,
  useRef,
  DragEvent,
  ClipboardEvent,
} from "react";

export interface UseDragAndDropOptions {
  onDrop?: (files: File[]) => void;
  onPaste?: (files: File[]) => void;
  accept?: string[]; // MIME types to accept
  multiple?: boolean;
  maxSize?: number; // Max file size in bytes
  disabled?: boolean;
}

export interface UseDragAndDropReturn {
  isDragging: boolean;
  dragCounter: number;
  handleDragEnter: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (e: DragEvent) => void;
  handlePaste: (e: ClipboardEvent) => void;
  getRootProps: () => {
    onDragEnter: (e: DragEvent) => void;
    onDragLeave: (e: DragEvent) => void;
    onDragOver: (e: DragEvent) => void;
    onDrop: (e: DragEvent) => void;
    onPaste: (e: ClipboardEvent) => void;
  };
}

/**
 * Custom hook for handling drag-and-drop and paste file operations
 * @param options - Configuration options for drag-and-drop behavior
 * @param options.onDrop - Callback when files are dropped
 * @param options.onPaste - Callback when files are pasted
 * @param options.accept - Array of accepted MIME types (default: ['image/*'])
 * @param options.multiple - Whether to accept multiple files (default: true)
 * @param options.maxSize - Maximum file size in bytes (default: 100MB)
 * @param options.disabled - Whether drag-and-drop is disabled (default: false)
 * @returns Object containing isDragging state and event handler props
 */
export function useDragAndDrop(
  options: UseDragAndDropOptions = {},
): UseDragAndDropReturn {
  const {
    onDrop,
    onPaste,
    accept = ["image/*"],
    multiple = true,
    maxSize = 100 * 1024 * 1024, // 100MB default
    disabled = false,
  } = options;

  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const validateFiles = useCallback(
    (files: File[]): File[] => {
      if (disabled) return [];

      let validFiles = files;

      // Filter by accepted MIME types
      if (accept.length > 0) {
        validFiles = validFiles.filter((file) => {
          return accept.some((pattern) => {
            if (pattern === "*/*") return true;
            if (pattern.endsWith("/*")) {
              const prefix = pattern.slice(0, -2);
              return file.type.startsWith(prefix);
            }
            return file.type === pattern;
          });
        });
      }

      // Filter by size
      if (maxSize) {
        validFiles = validFiles.filter((file) => file.size <= maxSize);
      }

      // Limit to single file if multiple is false
      if (!multiple && validFiles.length > 1) {
        validFiles = [validFiles[0]];
      }

      return validFiles;
    },
    [accept, maxSize, multiple, disabled],
  );

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounter.current++;
      if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      // Set the drop effect
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [disabled],
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounter.current = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        const validFiles = validateFiles(files);

        if (validFiles.length > 0) {
          onDrop?.(validFiles);
        }

        // Clear the data transfer
        e.dataTransfer.clearData();
      }
    },
    [disabled, validateFiles, onDrop],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        const validFiles = validateFiles(files);
        if (validFiles.length > 0) {
          onPaste?.(validFiles);
        }
      }
    },
    [disabled, validateFiles, onPaste],
  );

  const getRootProps = useCallback(
    () => ({
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
      onPaste: handlePaste,
    }),
    [handleDragEnter, handleDragLeave, handleDragOver, handleDrop, handlePaste],
  );

  return {
    isDragging,
    dragCounter: dragCounter.current,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handlePaste,
    getRootProps,
  };
}
