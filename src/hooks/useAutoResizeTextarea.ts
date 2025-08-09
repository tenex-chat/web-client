import { useEffect, useRef, RefObject } from 'react'

interface UseAutoResizeTextareaProps {
  value: string
  maxHeight?: number
  minHeight?: number
}

/**
 * Hook to automatically resize a textarea based on its content
 * Returns a ref to be attached to the textarea element
 */
export function useAutoResizeTextarea({
  value,
  maxHeight = 200,
  minHeight = 60,
}: UseAutoResizeTextareaProps): RefObject<HTMLTextAreaElement | null> {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to min to get proper scrollHeight
    textarea.style.height = `${minHeight}px`
    
    // Calculate new height based on scrollHeight
    const newHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    
    // Set the new height
    textarea.style.height = `${newHeight}px`
    
    // Add or remove scrollbar based on content
    if (textarea.scrollHeight > maxHeight) {
      textarea.style.overflowY = 'auto'
    } else {
      textarea.style.overflowY = 'hidden'
    }
  }, [value, maxHeight, minHeight])

  // Set initial styles on mount
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    textarea.style.minHeight = `${minHeight}px`
    textarea.style.maxHeight = `${maxHeight}px`
    textarea.style.overflowY = 'hidden'
    textarea.style.resize = 'none'
  }, [maxHeight, minHeight])

  return textareaRef
}