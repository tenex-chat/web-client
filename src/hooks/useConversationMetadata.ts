import { useSubscribe } from "@nostr-dev-kit/ndk-hooks"
import { useMemo } from "react"
import { NDKKind } from "@nostr-dev-kit/ndk"

interface ConversationMetadata {
  title?: string
  updatedAt?: number
}

/**
 * Hook to subscribe to metadata events (kind 513) for a specific conversation
 * These events contain updated metadata like conversation titles
 */
export function useConversationMetadata(conversationId: string | undefined): ConversationMetadata | null {
  // Subscribe to kind 513 events for this conversation
  const { events } = useSubscribe(
    conversationId
      ? [
          {
            kinds: [513 as NDKKind],
            "#e": [conversationId],
          },
        ]
      : false,
    {
      closeOnEose: false,
      groupable: true,
    }
  )

  // Process metadata events to extract the latest title
  const metadata = useMemo(() => {
    if (!events || events.length === 0) return null

    // Sort by created_at to get the most recent metadata
    const sortedEvents = [...events].sort((a, b) => 
      (b.created_at || 0) - (a.created_at || 0)
    )

    // Get the most recent event
    const latestEvent = sortedEvents[0]
    if (!latestEvent) return null

    // Extract title from the event tags
    const titleTag = latestEvent.tags.find(tag => tag[0] === "title")
    
    return {
      title: titleTag?.[1],
      updatedAt: latestEvent.created_at,
    }
  }, [events])

  return metadata
}