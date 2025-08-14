import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import type { NDKKind } from "@nostr-dev-kit/ndk-hooks"
import { EVENT_KINDS } from "@/lib/constants"
import { useMemo } from "react"
import { logger } from "@/lib/logger"

interface StreamingResponse {
  agentPubkey: string
  content: string
  lastSequence: number
}

/**
 * Hook to subscribe to streaming response events (kind 21111)
 * for a specific conversation/thread
 */
export function useStreamingResponses(conversationId: string | null) {
  logger.debug("useStreamingResponses", { conversationId });
  
  // Subscribe to streaming responses for this conversation
  const { events: streamingEvents } = useSubscribe(
    conversationId
      ? [
          {
            kinds: [EVENT_KINDS.STREAMING_RESPONSE as NDKKind],
            "#e": [conversationId],
          },
        ]
      : false,
    {},
    [conversationId]
  )

  // Process streaming events to accumulate content per agent
  const streamingResponses = useMemo(() => {
    if (!streamingEvents || streamingEvents.length === 0) return new Map<string, StreamingResponse>()

    const responsesByAgent = new Map<string, StreamingResponse>()

    // Sort events by created_at first, then by sequence to ensure proper ordering
    const sortedEvents = [...streamingEvents].sort((a, b) => {
      const timeDiff = (a.created_at || 0) - (b.created_at || 0)
      if (timeDiff !== 0) return timeDiff

      const seqA = parseInt(a.tagValue("sequence") || "0", 10)
      const seqB = parseInt(b.tagValue("sequence") || "0", 10)
      return seqA - seqB
    })

    // Process events in order, accumulating content
    for (const event of sortedEvents) {
      // The agent pubkey is the event's pubkey (the author of the streaming response)
      const agentPubkey = event.pubkey
      if (!agentPubkey) {
        continue
      }

      const sequenceStr = event.tagValue("sequence")
      const sequence = sequenceStr ? parseInt(sequenceStr, 10) : 0

      const existing = responsesByAgent.get(agentPubkey)
      
      // Only append content if this is a new sequence number we haven't seen
      if (!existing || sequence > existing.lastSequence) {
        const accumulatedContent = (existing?.content || "") + event.content
        responsesByAgent.set(agentPubkey, {
          agentPubkey,
          content: accumulatedContent,
          lastSequence: sequence,
        })
      }
    }

    return responsesByAgent
  }, [streamingEvents])

  return {
    streamingResponses,
    hasStreamingResponses: streamingResponses.size > 0,
  }
}