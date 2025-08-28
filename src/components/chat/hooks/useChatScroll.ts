import React, { useState, useEffect, useRef, useCallback } from 'react'
import type { Message } from './useChatMessages'

interface ChatScrollProps {
  scrollAreaRef: React.RefObject<HTMLDivElement>
  showScrollToBottom: boolean
  unreadCount: number
  scrollToBottom: (smooth?: boolean) => void
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void
  isNearBottom: boolean
}

/**
 * Hook for managing chat scroll behavior
 * Handles auto-scroll, unread tracking, and scroll-to-bottom functionality
 */
export function useChatScroll(messages: Message[]): ChatScrollProps {
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const lastMessageCountRef = useRef(0)
  const userScrolledRef = useRef(false)

  // Helper function to check if user is near bottom
  const checkIfNearBottom = useCallback((container: Element) => {
    const threshold = 100 // pixels from bottom to consider "near bottom"
    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight
    return scrollBottom <= threshold
  }, [])

  // Helper function to scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        })
        setShowScrollToBottom(false)
        setUnreadCount(0)
        isNearBottomRef.current = true
      }
    }
  }, [])

  // Smart auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        // Check if we have new messages
        const hasNewMessages = messages.length > lastMessageCountRef.current
        const isInitialLoad = lastMessageCountRef.current === 0 && messages.length > 0
        
        // Auto-scroll only if:
        // 1. Initial load OR
        // 2. User is near bottom and hasn't manually scrolled away OR
        // 3. User just sent a message
        if (isInitialLoad || (isNearBottomRef.current && !userScrolledRef.current)) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight
        } else if (hasNewMessages && !isNearBottomRef.current) {
          // User is reading history and new messages arrived
          const newMessageCount = messages.length - lastMessageCountRef.current
          setUnreadCount(prev => prev + newMessageCount)
          setShowScrollToBottom(true)
        }
        
        lastMessageCountRef.current = messages.length
        
        // Reset userScrolledRef after processing
        if (hasNewMessages) {
          userScrolledRef.current = false
        }
      }
    }
  }, [messages, checkIfNearBottom])

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget?.querySelector('[data-radix-scroll-area-viewport]')
    if (!container) return

    // Track if user is near bottom
    const wasNearBottom = isNearBottomRef.current
    isNearBottomRef.current = checkIfNearBottom(container)

    // If user scrolled away from bottom, mark as user-initiated scroll
    if (wasNearBottom && !isNearBottomRef.current) {
      userScrolledRef.current = true
    }

    // Update scroll-to-bottom button visibility
    setShowScrollToBottom(!isNearBottomRef.current)

    // If scrolled back to bottom, clear unread count
    if (isNearBottomRef.current) {
      setUnreadCount(0)
    }
  }, [checkIfNearBottom])

  return {
    scrollAreaRef: scrollAreaRef as React.RefObject<HTMLDivElement>,
    showScrollToBottom,
    unreadCount,
    scrollToBottom,
    handleScroll,
    isNearBottom: isNearBottomRef.current
  }
}