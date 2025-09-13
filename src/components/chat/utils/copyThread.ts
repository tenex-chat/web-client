import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import type { NDK } from "@nostr-dev-kit/ndk-hooks";
import type { Message } from "@/components/chat/hooks/useChatMessages";

interface JSONMessage {
  id: string;
  author: string;
  timestamp: string;
  content: string;
  tags: {
    phase?: string[];
    tool?: string[];
    p?: string[];
  };
  replies?: JSONMessage[];
}

/**
 * Fetch profile name for a pubkey
 */
async function getProfileName(
  ndk: NDK | undefined,
  pubkey: string,
): Promise<string> {
  if (!ndk) return `User ${pubkey.slice(0, 8)}...`;

  try {
    const user = ndk.getUser({ pubkey });
    await user.fetchProfile();
    const profile = user.profile;
    return (
      profile?.displayName || profile?.name || `User ${pubkey.slice(0, 8)}...`
    );
  } catch {
    return `User ${pubkey.slice(0, 8)}...`;
  }
}

/**
 * Recursively formats a message and its replies as markdown
 */
async function formatMessageWithReplies(
  event: NDKEvent,
  allEvents: NDKEvent[],
  ndk: NDK | undefined,
  depth: number = 0,
  processedIds: Set<string> = new Set(),
  profileCache: Map<string, string> = new Map(),
): Promise<string[]> {
  const lines: string[] = [];

  // Avoid processing the same event twice
  if (processedIds.has(event.id)) {
    return lines;
  }
  processedIds.add(event.id);

  const timestamp = event.created_at
    ? new Date(event.created_at * 1000)
    : new Date();
  const formattedTime = timestamp.toLocaleString();

  // Get author info with caching
  const authorPubkey = event.pubkey;
  let authorName = profileCache.get(authorPubkey);
  if (!authorName) {
    authorName = await getProfileName(ndk, authorPubkey);
    profileCache.set(authorPubkey, authorName);
  }

  // Add indentation based on depth
  const indent = "  ".repeat(depth);

  // Add message header with indentation
  lines.push(`${indent}## ${authorName}`);
  lines.push(`${indent}*${formattedTime}*`);
  lines.push("");

  // Add message content with proper indentation
  const content = event.content || "";
  const contentLines = content.split("\n");
  contentLines.forEach((line) => {
    lines.push(`${indent}${line}`);
  });
  lines.push("");

  // Find direct replies to this event
  let directReplies = allEvents.filter((e) => {
    if (e.id === event.id) return false;
    const eTags = e.tags?.filter((tag) => tag[0] === "e") || [];
    return eTags.some((tag) => tag[1] === event.id);
  });

  // Sort replies by timestamp (filter out those without timestamps)
  directReplies = directReplies
    .filter((reply) => reply.created_at !== undefined)
    .sort((a, b) => a.created_at - b.created_at);

  // Process each reply recursively
  if (directReplies.length > 0) {
    for (let index = 0; index < directReplies.length; index++) {
      const reply = directReplies[index];
      const replyLines = await formatMessageWithReplies(
        reply,
        allEvents,
        ndk,
        depth + 1,
        processedIds,
        profileCache,
      );
      lines.push(...replyLines);

      // Add separator between replies at the same level
      if (index < directReplies.length - 1) {
        lines.push(`${indent}  ---`);
        lines.push("");
      }
    }
  }

  return lines;
}

/**
 * Formats a thread as markdown with proper indentation
 */
export async function formatThreadAsMarkdown(
  messages: Message[],
  rootEvent: NDKEvent | null,
  allThreadEvents: NDKEvent[] = [],
  ndk: NDK | undefined = undefined,
): Promise<string> {
  if (!messages || messages.length === 0) {
    return "";
  }

  const lines: string[] = [];

  // Add thread title if available
  if (rootEvent) {
    const titleTag = rootEvent.tags?.find(
      (tag: string[]) => tag[0] === "title",
    )?.[1];
    const title = titleTag || rootEvent.content?.split("\n")[0] || "Thread";
    lines.push(`# ${title}`);
    lines.push("");
  }

  // Collect all events (from messages and allThreadEvents)
  const allEvents = [...messages.map((m) => m.event), ...allThreadEvents];

  // Remove duplicates based on event ID
  const uniqueEvents = Array.from(
    new Map(allEvents.map((e) => [e.id, e])).values(),
  );

  // Track which events have been processed and cache profiles
  const processedIds = new Set<string>();
  const profileCache = new Map<string, string>();

  // Process only root-level messages (those without e-tags to other messages in the thread)
  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];

    // Skip if already processed as a reply
    if (processedIds.has(message.event.id)) {
      continue;
    }

    // Check if this message is a reply to another message in the thread
    const isReplyToThreadMessage = messages.some((m) => {
      if (m.event.id === message.event.id) return false;
      const eTags = message.event.tags?.filter((tag) => tag[0] === "e") || [];
      return eTags.some((tag) => tag[1] === m.event.id);
    });

    // Only process root-level messages
    if (
      !isReplyToThreadMessage ||
      (rootEvent && message.event.id === rootEvent.id)
    ) {
      const messageLines = await formatMessageWithReplies(
        message.event,
        uniqueEvents,
        ndk,
        0,
        processedIds,
        profileCache,
      );
      lines.push(...messageLines);

      // Add separator between root messages
      if (index < messages.length - 1) {
        lines.push("---");
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

/**
 * Extract specific tags from an event
 */
function extractTags(event: NDKEvent): JSONMessage["tags"] {
  const tags: JSONMessage["tags"] = {};

  if (!event.tags) return tags;

  // Extract phase tags
  const phaseTags = event.tags.filter((tag) => tag[0] === "phase" && tag[1]);
  if (phaseTags.length > 0) {
    tags.phase = phaseTags.map((tag) => tag[1]);
  }

  // Extract tool tags
  const toolTags = event.tags.filter((tag) => tag[0] === "tool" && tag[1]);
  if (toolTags.length > 0) {
    tags.tool = toolTags.map((tag) => tag[1]);
  }

  // Extract p tags (mentions/recipients)
  const pTags = event.tags.filter((tag) => tag[0] === "p" && tag[1]);
  if (pTags.length > 0) {
    tags.p = pTags.map((tag) => tag[1]);
  }

  return tags;
}

/**
 * Recursively format a message and its replies as JSON
 */
async function formatMessageAsJSON(
  event: NDKEvent,
  allEvents: NDKEvent[],
  ndk: NDK | undefined,
  processedIds: Set<string> = new Set(),
  profileCache: Map<string, string> = new Map(),
): Promise<JSONMessage | null> {
  // Avoid processing the same event twice
  if (processedIds.has(event.id)) {
    return null;
  }
  processedIds.add(event.id);

  // Get author info with caching
  const authorPubkey = event.pubkey;
  let authorName = profileCache.get(authorPubkey);
  if (!authorName) {
    authorName = await getProfileName(ndk, authorPubkey);
    profileCache.set(authorPubkey, authorName);
  }

  const timestamp = event.created_at
    ? new Date(event.created_at * 1000)
    : new Date();

  const message: JSONMessage = {
    id: event.id,
    author: authorName,
    timestamp: timestamp.toISOString(),
    content: event.content || "",
    tags: extractTags(event),
  };

  // Find direct replies to this event
  let directReplies = allEvents.filter((e) => {
    if (e.id === event.id) return false;
    const eTags = e.tags?.filter((tag) => tag[0] === "e") || [];
    return eTags.some((tag) => tag[1] === event.id);
  });

  // Sort replies by timestamp (filter out those without timestamps)
  directReplies = directReplies
    .filter((reply) => reply.created_at !== undefined)
    .sort((a, b) => a.created_at - b.created_at);

  // Process replies recursively
  if (directReplies.length > 0) {
    const replies: JSONMessage[] = [];
    for (const reply of directReplies) {
      const replyMessage = await formatMessageAsJSON(
        reply,
        allEvents,
        ndk,
        processedIds,
        profileCache,
      );
      if (replyMessage) {
        replies.push(replyMessage);
      }
    }
    if (replies.length > 0) {
      message.replies = replies;
    }
  }

  return message;
}

/**
 * Formats a thread as JSON with proper nesting
 */
export async function formatThreadAsJSON(
  messages: Message[],
  rootEvent: NDKEvent | null,
  allThreadEvents: NDKEvent[] = [],
  ndk: NDK | undefined = undefined,
): Promise<string> {
  if (!messages || messages.length === 0) {
    return "[]";
  }

  // Collect all events
  const allEvents = [...messages.map((m) => m.event), ...allThreadEvents];

  // Remove duplicates based on event ID
  const uniqueEvents = Array.from(
    new Map(allEvents.map((e) => [e.id, e])).values(),
  );

  // Track which events have been processed and cache profiles
  const processedIds = new Set<string>();
  const profileCache = new Map<string, string>();

  const threadMessages: JSONMessage[] = [];

  // Process only root-level messages
  for (const message of messages) {
    // Skip if already processed as a reply
    if (processedIds.has(message.event.id)) {
      continue;
    }

    // Check if this message is a reply to another message in the thread
    const isReplyToThreadMessage = messages.some((m) => {
      if (m.event.id === message.event.id) return false;
      const eTags = message.event.tags?.filter((tag) => tag[0] === "e") || [];
      return eTags.some((tag) => tag[1] === m.event.id);
    });

    // Only process root-level messages
    if (
      !isReplyToThreadMessage ||
      (rootEvent && message.event.id === rootEvent.id)
    ) {
      const jsonMessage = await formatMessageAsJSON(
        message.event,
        uniqueEvents,
        ndk,
        processedIds,
        profileCache,
      );
      if (jsonMessage) {
        threadMessages.push(jsonMessage);
      }
    }
  }

  return JSON.stringify(threadMessages, null, 2);
}
