import { useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import type { NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { EVENT_KINDS } from "../lib/constants.js";
import { useMemo } from "react";

interface StreamingResponse {
    agentPubkey: string;
    content: string;
    sequence: number;
}

/**
 * Hook to subscribe to streaming response events (kind 21111)
 * for a specific conversation/thread
 */
export function useStreamingResponses(conversationId: string | null) {
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
    );

    // Process streaming events to get the latest content per agent
    const streamingResponses = useMemo(() => {
        if (!streamingEvents || streamingEvents.length === 0) return new Map<string, StreamingResponse>();

        const responsesByAgent = new Map<string, StreamingResponse>();

        // Group events by agent pubkey and find the latest (highest sequence) for each
        for (const event of streamingEvents) {
            const agentPubkey = event.tagValue("p");
            if (!agentPubkey) {
                continue;
            }

            const sequenceStr = event.tagValue("sequence");
            const sequence = sequenceStr ? parseInt(sequenceStr, 10) : 0;

            const existing = responsesByAgent.get(agentPubkey);
            if (!existing || sequence > existing.sequence) {
                responsesByAgent.set(agentPubkey, {
                    agentPubkey,
                    content: event.content,
                    sequence,
                });
            }
        }

        return responsesByAgent;
    }, [streamingEvents]);

    return {
        streamingResponses,
        hasStreamingResponses: streamingResponses.size > 0,
    };
}