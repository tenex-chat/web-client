import type NDK from "@nostr-dev-kit/ndk-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

/**
 * Contract-aligned helpers for kinds 24133/24134
 * Kind 24133: Operations Status (incoming only)
 * Kind 24134: Stop Request (outgoing only)
 */

export interface Kind24133Snapshot {
  projectId: string;
  eId: string;
  agentPubkeys: string[];
  createdAt: number;
  eventId: string;
}

/**
 * Parse kind 24133 (Operations Status) according to contract
 * Tags: a = project id, e = subject event id, p (0..n) = agent pubkeys
 * Content must be empty
 */
export function parseKind24133(ev: NDKEvent): Kind24133Snapshot | null {
  if (ev.kind !== 24133) return null;

  const projectId = ev.tagValue("a");
  const eId = ev.tagValue("e");

  // Collect all valid 'p' tags (agent pubkeys)
  const agentPubkeys: string[] = [];
  ev.tags?.forEach((tag) => {
    if (tag[0] === "p" && tag[1]) {
      agentPubkeys.push(tag[1]);
    }
  });

  // Dedupe and sort agent pubkeys
  const uniqueAgents = [...new Set(agentPubkeys)].sort();

  const result = {
    projectId,
    eId,
    agentPubkeys: uniqueAgents,
    createdAt: ev.created_at || 0,
    eventId: ev.id || "",
  };

  // DEBUG: Log parsed result
  console.log("DEBUG parseKind24133 - Parsed snapshot:", {
    ...result,
    agentPubkeys: result.agentPubkeys.map((pk) => pk.slice(0, 8)),
  });
  // END DEBUG

  return result;
}

/**
 * Publish kind 24134 (Stop Request) according to contract
 * Tags: a = project id, e (1..n) = target event ids
 * Content must be empty
 */
export async function publishKind24134(
  ndk: NDK,
  { projectId, eIds }: { projectId: string; eIds: string[] },
): Promise<void> {

  // Use provided event IDs - trust NDK validation
  if (eIds.length === 0) return;

  const event = new NDKEvent(ndk);
  event.kind = 24134;

  // Build tags
  event.tags = [["a", projectId]];

  // Add each event ID as 'e' tag
  eIds.forEach((eId) => {
    event.tags.push(["e", eId]);
  });

  await event.sign();
  await event.publish();
}

/**
 * Simple function to stop an event's operations
 */
export async function stopEvent(
  ndk: NDK,
  projectId: string,
  eventId: string,
): Promise<void> {
  if (!ndk || !projectId || !eventId) return;

  try {
    await publishKind24134(ndk, { projectId, eIds: [eventId] });
  } catch (error) {
    console.warn("Failed to publish stop request:", error);
  }
}

/**
 * Simple function to stop a conversation's operations
 */
export async function stopConversation(
  ndk: NDK,
  projectId: string,
  conversationRootId: string,
): Promise<void> {
  if (!ndk || !projectId || !conversationRootId) return;

  try {
    await publishKind24134(ndk, { projectId, eIds: [conversationRootId] });
  } catch (error) {
    console.warn("Failed to publish stop request:", error);
  }
}
