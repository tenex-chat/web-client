import { useCallback } from 'react'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { publishKind24134 } from '@/lib/ndk-events/operations'

/**
 * Publisher for kind 24134 (Stop Request) only
 * Includes throttling to prevent spam (3s per target ID)
 */
const lastStopTimes = new Map<string, number>()
const THROTTLE_MS = 3000 // 3 seconds

export function useStopOperations(projectId?: string) {
  const { ndk } = useNDK()

  const stopEvent = useCallback(async (eventId: string) => {
    if (!ndk || !projectId || !eventId) return

    // Throttle: check if we recently sent stop for this eventId
    const now = Date.now()
    const lastTime = lastStopTimes.get(eventId) || 0
    if (now - lastTime < THROTTLE_MS) {
      return // Skip if too recent
    }

    try {
      await publishKind24134(ndk, { projectId, eIds: [eventId] })
      lastStopTimes.set(eventId, now)
    } catch (error) {
      console.warn('Failed to publish stop request:', error)
    }
  }, [ndk, projectId])

  const stopConversation = useCallback(async (conversationRootId: string) => {
    if (!ndk || !projectId || !conversationRootId) return

    // Throttle: check if we recently sent stop for this conversation
    const now = Date.now()
    const lastTime = lastStopTimes.get(conversationRootId) || 0
    if (now - lastTime < THROTTLE_MS) {
      return // Skip if too recent
    }

    try {
      await publishKind24134(ndk, { projectId, eIds: [conversationRootId] })
      lastStopTimes.set(conversationRootId, now)
    } catch (error) {
      console.warn('Failed to publish stop request:', error)
    }
  }, [ndk, projectId])

  return {
    stopEvent,
    stopConversation
  }
}