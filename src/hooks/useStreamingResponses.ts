import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import type { NDKKind } from "@nostr-dev-kit/ndk-hooks"
import { EVENT_KINDS } from "@/lib/constants"
import { useMemo, useRef, useEffect } from "react"
import { logger } from "@/lib/logger"
import { DeltaContentAccumulator } from "@/lib/deltaContentAccumulator"

interface StreamingResponse {
  agentPubkey: string
  content: string
  lastSequence: number
  hasGaps: boolean
}

/**
 * Hook to subscribe to streaming response events (kind 21111)
 * for a specific conversation/thread or as replies to a specific event
 * Now handles delta-based content accumulation
 */
export function useStreamingResponses(
  conversationId: string | null,
  replyToEventId?: string | null
) {
  logger.debug("useStreamingResponses", { conversationId, replyToEventId });
  
  // Store accumulators per agent
  const accumulatorsRef = useRef(new Map<string, DeltaContentAccumulator>())
  
  // Subscribe to streaming responses for this conversation or as replies
  const { events: streamingEvents } = useSubscribe(
    conversationId || replyToEventId
      ? [
          {
            kinds: [EVENT_KINDS.STREAMING_RESPONSE as NDKKind],
            "#e": replyToEventId ? [replyToEventId] : conversationId ? [conversationId] : [],
          },
        ]
      : false,
    {},
    [conversationId, replyToEventId]
  )

  // Clear accumulators when conversation or reply target changes
  useEffect(() => {
    if (!conversationId && !replyToEventId) {
      accumulatorsRef.current.clear()
    }
  }, [conversationId, replyToEventId])

  // Process streaming events - each event contains a DELTA to append
  const streamingResponses = useMemo(() => {
    if (!streamingEvents || streamingEvents.length === 0) {
      // Clear accumulators when no events
      accumulatorsRef.current.clear()
      return new Map<string, StreamingResponse>()
    }

    const responsesByAgent = new Map<string, StreamingResponse>()

    // Group events by agent
    const eventsByAgent = new Map<string, typeof streamingEvents>()
    for (const event of streamingEvents) {
      const agentPubkey = event.pubkey
      if (!agentPubkey) continue
      
      if (!eventsByAgent.has(agentPubkey)) {
        eventsByAgent.set(agentPubkey, [])
      }
      eventsByAgent.get(agentPubkey)!.push(event)
    }

    // Process each agent's events
    for (const [agentPubkey, agentEvents] of eventsByAgent) {
      // Get or create accumulator for this agent
      if (!accumulatorsRef.current.has(agentPubkey)) {
        accumulatorsRef.current.set(agentPubkey, new DeltaContentAccumulator())
      }
      const accumulator = accumulatorsRef.current.get(agentPubkey)!
      
      // Sort events by sequence
      const sortedEvents = [...agentEvents].sort((a, b) => {
        const seqA = parseInt(a.tagValue("sequence") || "0", 10)
        const seqB = parseInt(b.tagValue("sequence") || "0", 10)
        return seqA - seqB
      })
      
      // Add all events to accumulator
      let content = ''
      let lastSequence = 0
      for (const event of sortedEvents) {
        content = accumulator.addEvent(event)
        const sequence = parseInt(event.tagValue("sequence") || "0", 10)
        if (sequence > lastSequence) {
          lastSequence = sequence
        }
      }
      
      // Store the reconstructed content
      responsesByAgent.set(agentPubkey, {
        agentPubkey,
        content,
        lastSequence,
        hasGaps: accumulator.hasSequenceGaps()
      })
      
      // Log if there are gaps
      if (accumulator.hasSequenceGaps()) {
        logger.warn("Sequence gaps detected", {
          agentPubkey,
          missingSequences: accumulator.getMissingSequences()
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