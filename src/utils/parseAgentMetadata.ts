import { NDKEvent, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import type { NDKUser, ProfilePointer } from "@nostr-dev-kit/ndk-hooks";

export interface AgentMetadata {
  name?: string;
  about?: string;
  picture?: string;
  systemPrompt?: string;
  instructions?: string;
  useCriteria?: string[];
  role?: string;
  // Standard profile fields
  displayName?: string;
  image?: string;
  banner?: string;
  website?: string;
  lud06?: string;
  lud16?: string;
  nip05?: string;
}

/**
 * Parse agent-specific metadata from a kind:0 event
 * This handles both standard profile fields and agent-specific fields
 */
export function parseAgentMetadata(event: NDKEvent | undefined): AgentMetadata | null {
  if (!event || event.kind !== NDKKind.Metadata) return null;

  try {
    // Parse the content JSON
    const content = JSON.parse(event.content || "{}");
    
    // Extract standard profile fields
    const metadata: AgentMetadata = {
      name: content.name,
      about: content.about,
      picture: content.picture,
      displayName: content.display_name,
      image: content.image,
      banner: content.banner,
      website: content.website,
      lud06: content.lud06,
      lud16: content.lud16,
      nip05: content.nip05,
    };

    // Extract agent-specific fields from content
    if (content.system_prompt) {
      metadata.systemPrompt = content.system_prompt;
    }
    if (content.instructions) {
      metadata.instructions = content.instructions;
    }
    if (content.role) {
      metadata.role = content.role;
    }
    
    // Check for use criteria in content (could be string or array)
    if (content.use_criteria) {
      if (Array.isArray(content.use_criteria)) {
        metadata.useCriteria = content.use_criteria;
      } else if (typeof content.use_criteria === 'string') {
        // Split by newlines if it's a string
        metadata.useCriteria = content.use_criteria
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0);
      }
    }

    // Also check tags for agent-specific data (some implementations might use tags)
    event.tags.forEach(tag => {
      if (tag[0] === 'system-prompt' && tag[1]) {
        metadata.systemPrompt = tag[1];
      } else if (tag[0] === 'instructions' && tag[1]) {
        metadata.instructions = tag[1];
      } else if (tag[0] === 'use-criteria' && tag[1]) {
        if (!metadata.useCriteria) metadata.useCriteria = [];
        metadata.useCriteria.push(tag[1]);
      } else if (tag[0] === 'role' && tag[1]) {
        metadata.role = tag[1];
      }
    });

    return metadata;
  } catch (error) {
    console.error('Failed to parse agent metadata:', error);
    return null;
  }
}

/**
 * Check if a kind:0 event contains agent-specific metadata
 */
export function hasAgentMetadata(event: NDKEvent | undefined): boolean {
  if (!event || event.kind !== NDKKind.Metadata) return false;

  const metadata = parseAgentMetadata(event);
  if (!metadata) return false;

  // Check if it has any agent-specific fields
  return !!(
    metadata.systemPrompt ||
    metadata.instructions ||
    (metadata.useCriteria && metadata.useCriteria.length > 0) ||
    metadata.role
  );
}

/**
 * Get a user's kind:0 metadata event
 */
export async function getUserMetadataEvent(
  ndk: any,
  pubkey: string
): Promise<NDKEvent | null> {
  try {
    const events = await ndk.fetchEvents({
      kinds: [NDKKind.Metadata],
      authors: [pubkey],
      limit: 1,
    });

    if (events && events.size > 0) {
      return Array.from(events)[0];
    }

    return null;
  } catch (error) {
    console.error('Failed to fetch user metadata:', error);
    return null;
  }
}