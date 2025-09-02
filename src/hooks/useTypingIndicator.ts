import { useCallback, useRef, useEffect } from 'react'
import { NDKEvent } from '@nostr-dev-kit/ndk-hooks'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { EVENT_KINDS, TIMING } from '@/lib/constants'
import { logger } from '@/lib/logger'

interface UseTypingIndicatorProps {
  threadId?: string
  taskId?: string
  enabled?: boolean
}

/**
 * Hook to manage typing indicator events
 * Sends typing start/stop events and manages the automatic timeout
 */
export function useTypingIndicator({
  threadId,
  taskId,
  enabled = true,
}: UseTypingIndicatorProps) {
  const { ndk } = useNDK()
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingRef = useRef(false)
  const lastSentRef = useRef<number>(0)

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      // Send stop event if we were typing
      if (isTypingRef.current && ndk?.signer) {
        sendTypingStop()
      }
    }
  }, [])

  const sendTypingStart = useCallback(async () => {
    if (!ndk?.signer || !enabled) return
    const targetId = threadId || taskId
    if (!targetId) return

    // Don't send if we sent one recently (within timeout period)
    const now = Date.now()
    if (now - lastSentRef.current < TIMING.TYPING_INDICATOR_TIMEOUT) return

    try {
      const event = new NDKEvent(ndk)
      event.kind = EVENT_KINDS.TYPING_INDICATOR
      event.content = ''
      event.tags = [['e', targetId]]
      
      await event.publish()
      lastSentRef.current = now
      isTypingRef.current = true
      
      logger.debug('Sent typing indicator start', { targetId })
    } catch (error) {
      logger.error('Failed to send typing indicator start:', error)
    }
  }, [ndk, enabled, threadId, taskId])

  const sendTypingStop = useCallback(async () => {
    if (!ndk?.signer || !enabled) return
    const targetId = threadId || taskId
    if (!targetId) return

    try {
      const event = new NDKEvent(ndk)
      event.kind = EVENT_KINDS.TYPING_INDICATOR_STOP
      event.content = ''
      event.tags = [['e', targetId]]
      
      await event.publish()
      isTypingRef.current = false
      
      logger.debug('Sent typing indicator stop', { targetId })
    } catch (error) {
      logger.error('Failed to send typing indicator stop:', error)
    }
  }, [ndk, enabled, threadId, taskId])

  const handleTyping = useCallback(() => {
    if (!enabled) return

    // Send typing start if not already typing
    if (!isTypingRef.current) {
      sendTypingStart()
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set new timeout to stop typing after timeout period of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        sendTypingStop()
      }
    }, TIMING.TYPING_INDICATOR_TIMEOUT)
  }, [enabled, sendTypingStart, sendTypingStop])

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
    if (isTypingRef.current) {
      sendTypingStop()
    }
  }, [sendTypingStop])

  return {
    handleTyping,
    stopTyping,
  }
}