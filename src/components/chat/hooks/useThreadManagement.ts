import { useState, useCallback } from "react";
import {
  NDKEvent,
  NDKThread,
  useNDK,
  useNDKCurrentUser,
} from "@nostr-dev-kit/ndk-hooks";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import type { Message } from "./useChatMessages";
import type { AgentInstance } from "@/types/agent";
import type { NostrEntity } from "@/lib/utils/nostrEntityParser";
import { isBrainstormMessage } from "@/lib/utils/brainstorm";
import { useBrainstormMode } from "@/stores/brainstorm-mode-store";

export interface ImageUpload {
  url: string;
  metadata?: {
    sha256: string;
    mimeType: string;
    size: number;
    blurhash?: string;
  };
}

export interface ThreadManagementOptions {
  project: NDKProject | null | undefined;
  initialRootEvent: NDKEvent | null;
  extraTags?: string[][];
  onThreadCreated?: (thread: NDKEvent) => void;
  onlineAgents?: { pubkey: string; slug: string }[];
  replyingTo?: NDKEvent | null;
  quotedEvents?: NostrEntity[];
}

/**
 * Hook for managing thread operations
 * Handles creating threads, sending replies, and NDK event tagging
 */
export function useThreadManagement({
  project,
  initialRootEvent,
  extraTags,
  onThreadCreated,
  onlineAgents,
  replyingTo,
  quotedEvents = [],
}: ThreadManagementOptions) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(
    initialRootEvent,
  );
  const { getCurrentSession } = useBrainstormMode();
  const brainstormSession = getCurrentSession();

  const createThread = useCallback(
    async (
      content: string,
      mentions: AgentInstance[],
      images: ImageUpload[],
      autoTTS: boolean,
      selectedAgent: string | null,
    ) => {
      if (!ndk || !user) return null;

      const newThreadEvent = new NDKThread(ndk);
      newThreadEvent.content = content;
      newThreadEvent.title = content.slice(0, 50);

      if (project) newThreadEvent.tag(project.tagReference());

      if (extraTags && extraTags.length > 0) {
        newThreadEvent.tags.push(...extraTags);
      }

      images.forEach((upload) => {
        if (upload.metadata) {
          newThreadEvent.tags.push([
            "image",
            upload.metadata.sha256,
            upload.url,
            upload.metadata.mimeType,
            upload.metadata.size.toString(),
          ]);
          if (upload.metadata.blurhash) {
            newThreadEvent.tags.push(["blurhash", upload.metadata.blurhash]);
          }
        }
      });

      mentions.forEach((agent) => {
        newThreadEvent.tags.push(["p", agent.pubkey]);
      });

      if (selectedAgent && mentions.every((m) => m.pubkey !== selectedAgent)) {
        newThreadEvent.tags.push(["p", selectedAgent]);
      } else if (
        mentions.length === 0 &&
        !selectedAgent &&
        onlineAgents &&
        onlineAgents.length > 0
      ) {
        const projectManager = onlineAgents[0];
        newThreadEvent.tags.push(["p", projectManager.pubkey]);
      }

      // Extract and add hashtags from content
      const hashtagRegex = /#(\w+)/g;
      const hashtags = new Set<string>();
      let match;
      while ((match = hashtagRegex.exec(content)) !== null) {
        hashtags.add(match[1].toLowerCase());
      }
      hashtags.forEach(tag => {
        newThreadEvent.tags.push(["t", tag]);
      });

      if (autoTTS) {
        newThreadEvent.tags.push(["mode", "voice"]);
      }

      // Handle brainstorm mode encoding
      if (brainstormSession?.enabled && brainstormSession.moderatorPubkey) {
        // Add brainstorm mode tags
        newThreadEvent.tags.push(["mode", "brainstorm"]);
        newThreadEvent.tags.push(["t", "brainstorm"]);

        // Clear existing p-tags and add only the moderator with p-tag
        newThreadEvent.tags = newThreadEvent.tags.filter(tag => tag[0] !== "p");
        newThreadEvent.tags.push(["p", brainstormSession.moderatorPubkey]);

        // Add participants as ["participant", "<pubkey>"] tags without p-tagging
        brainstormSession.participantPubkeys.forEach(participantPubkey => {
          newThreadEvent.tags.push(["participant", participantPubkey]);
        });
      }

      await newThreadEvent.sign(undefined, { pTags: false });
      setLocalRootEvent(newThreadEvent);
      newThreadEvent.publish();

      // Notify parent component about the new thread
      if (onThreadCreated) {
        onThreadCreated(newThreadEvent);
      }

      return newThreadEvent;
    },
    [
      ndk,
      user,
      project,
      extraTags,
      onlineAgents,
      onThreadCreated,
      brainstormSession,
      quotedEvents,
    ],
  );

  const sendReply = useCallback(
    async (
      content: string,
      mentions: AgentInstance[],
      images: ImageUpload[],
      autoTTS: boolean,
      recentMessages: Message[],
      selectedAgent: string | null,
    ) => {
      if (!ndk || !user || !localRootEvent) return null;

      // If replying to a specific message, use that as the reply target
      // Otherwise reply to the thread root
      const targetEvent = replyingTo || localRootEvent;

      // Send a reply to the target event
      const replyEvent = targetEvent.reply();
      replyEvent.content = content;

      // Remove all p-tags that NDK's .reply() generated
      replyEvent.tags = replyEvent.tags.filter((tag) => tag[0] !== "p");

      // Add project tag if project exists
      if (project) {
        const tagId = project.tagId();
        if (tagId) {
          replyEvent.tags.push(["a", tagId]);
        }
      }

      // Add image tags for each uploaded image
      images.forEach((upload) => {
        if (upload.metadata) {
          replyEvent.tags.push([
            "image",
            upload.metadata.sha256,
            upload.url,
            upload.metadata.mimeType,
            upload.metadata.size.toString(),
          ]);
          if (upload.metadata.blurhash) {
            replyEvent.tags.push(["blurhash", upload.metadata.blurhash]);
          }
        }
      });

      // Only add p-tags if NOT in brainstorm mode (brainstorm mode will handle p-tags later)
      if (!(localRootEvent && isBrainstormMessage(localRootEvent))) {
        // Add p-tags for mentioned agents
        mentions.forEach((agent) => {
          replyEvent.tags.push(["p", agent.pubkey]);
        });

        // Check if there are @ mentions in the content that weren't resolved
        const hasUnresolvedMentions =
          /@[\w-]+/.test(content) && mentions.length === 0;

        if (selectedAgent && mentions.every((m) => m.pubkey !== selectedAgent)) {
          replyEvent.tags.push(["p", selectedAgent]);
        } else if (
          !hasUnresolvedMentions &&
          mentions.length === 0 &&
          !selectedAgent &&
          recentMessages.length > 0
        ) {
          const mostRecentNonUserMessage = [...recentMessages]
            .reverse()
            .find((msg) => msg.event.pubkey !== user.pubkey);

          if (mostRecentNonUserMessage) {
            replyEvent.tags.push(["p", mostRecentNonUserMessage.event.pubkey]);
          }
        }
      }

      // Add voice mode tag if auto-TTS is enabled
      if (autoTTS) {
        replyEvent.tags.push(["mode", "voice"]);
      }

      // In brainstorm conversations, preserve brainstorm mode tags and always p-tag ONLY the moderator
      if (localRootEvent && isBrainstormMessage(localRootEvent)) {
        // Add brainstorm mode tags to the reply
        const hasBrainstormMode = replyEvent.tags.some(
          tag => tag[0] === "mode" && tag[1] === "brainstorm"
        );
        if (!hasBrainstormMode) {
          replyEvent.tags.push(["mode", "brainstorm"]);
        }

        const hasBrainstormTag = replyEvent.tags.some(
          tag => tag[0] === "t" && tag[1] === "brainstorm"
        );
        if (!hasBrainstormTag) {
          replyEvent.tags.push(["t", "brainstorm"]);
        }

        // Also preserve participant tags from the root event
        const participantTags = localRootEvent.tags.filter(tag => tag[0] === "participant");
        participantTags.forEach(participantTag => {
          const hasThisParticipant = replyEvent.tags.some(
            tag => tag[0] === "participant" && tag[1] === participantTag[1]
          );
          if (!hasThisParticipant) {
            replyEvent.tags.push(participantTag);
          }
        });

        // Clear all existing p-tags and only add the moderator
        replyEvent.tags = replyEvent.tags.filter(tag => tag[0] !== "p");
        const moderatorPubkey = localRootEvent.tagValue("p");
        if (moderatorPubkey) {
          replyEvent.tags.push(["p", moderatorPubkey]);
        }
      }

      await replyEvent.sign(undefined, { pTags: false });
      await replyEvent.publish();

      return replyEvent;
    },
    [ndk, user, localRootEvent, project, replyingTo],
  );

  const sendMessage = useCallback(
    async (
      content: string,
      mentions: AgentInstance[],
      images: ImageUpload[],
      autoTTS: boolean,
      recentMessages: Message[],
      selectedAgent: string | null = null,
    ) => {
      if (!localRootEvent) {
        return createThread(content, mentions, images, autoTTS, selectedAgent);
      } else {
        return sendReply(
          content,
          mentions,
          images,
          autoTTS,
          recentMessages,
          selectedAgent,
        );
      }
    },
    [localRootEvent, createThread, sendReply],
  );

  return {
    localRootEvent,
    setLocalRootEvent,
    createThread,
    sendReply,
    sendMessage,
  };
}
