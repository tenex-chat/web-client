import React, { useRef, useCallback, memo, useState, useEffect } from "react";
import { Send, Mic, Paperclip, X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { motion, AnimatePresence } from "framer-motion";
import { ImagePreview } from "@/components/upload/ImagePreview";
import { ChatMentionMenu } from "./ChatMentionMenu";
import { VoiceDialog } from "@/components/dialogs/VoiceDialog";
import { ImageUploadQueue } from "@/components/upload/ImageUploadQueue";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import {
  NDKEvent,
  NDKThread,
  useNDK,
  useNDKCurrentUser,
} from "@nostr-dev-kit/ndk-hooks";
import { useReply } from "../contexts/ReplyContext";
import { NostrProfile } from "@/components/common/NostrProfile";
import { AgentSelector } from "./AgentSelector";
import { ModelSelector } from "./ModelSelector";
import type { AgentInstance } from "@/types/agent";
import type { Message } from "../hooks/useChatMessages";
import { useBlossomUpload } from "@/hooks/useBlossomUpload";
import { useMentions } from "@/hooks/useMentions";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { NDKTask } from "@/lib/ndk-events/NDKTask";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";
import { useProjectStatus } from "@/stores/projects";
import { findNostrEntities, type NostrEntity } from "@/lib/utils/nostrEntityParser";
import { EventPreview } from "./EventPreview";
import { BrainstormModeButton } from "./BrainstormModeButton";
import { useBrainstormMode } from "@/stores/brainstorm-mode-store";
import { isBrainstormMessage, getBrainstormModerator, getBrainstormParticipants } from "@/lib/utils/brainstorm";

interface ChatInputAreaProps {
  project?: NDKProject | null;
  rootEvent?: NDKEvent | null;
  extraTags?: string[][];
  onlineAgents?: AgentInstance[] | null;
  recentMessages?: Message[];
  disabled?: boolean;
  showVoiceButton?: boolean;
  className?: string;
  onThreadCreated?: (thread: NDKEvent) => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement>;
  initialContent?: string;
  onContentUsed?: () => void;
}

interface ImageUpload {
  url: string;
  metadata?: {
    sha256: string;
    mimeType: string;
    size: number;
    blurhash?: string;
  };
}

/**
 * Fully autonomous chat input area component
 * Manages its own state and publishes events directly to Nostr
 */
export const ChatInputArea = memo(function ChatInputArea({
  project,
  rootEvent,
  extraTags = [],
  onlineAgents,
  recentMessages = [],
  disabled = false,
  showVoiceButton = true,
  className,
  onThreadCreated,
  textareaRef: externalTextareaRef,
  initialContent = "",
  onContentUsed,
}: ChatInputAreaProps) {
  const { ndk } = useNDK();
  const user = useNDKCurrentUser();
  const isMobile = useIsMobile();
  const { replyingTo, clearReply } = useReply();
  const { voiceSettings } = useAI();
  const autoTTS = voiceSettings.autoSpeak;

  // Get project status for available models
  const projectDTag = project?.dTag;
  const projectStatus = useProjectStatus(projectDTag);

  // Local state - all input state is managed here
  const [messageInput, setMessageInput] = useState("");
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [quotedEvents, setQuotedEvents] = useState<NostrEntity[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  // Handle initial content when it changes
  useEffect(() => {
    if (initialContent) {
      setMessageInput(initialContent);
      if (onContentUsed) {
        onContentUsed();
      }
    }
  }, [initialContent]);

  // Refs
  const internalTextareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = externalTextareaRef || internalTextareaRef;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Draft persistence
  const threadId =
    rootEvent && rootEvent.kind !== NDKTask.kind ? rootEvent.id : undefined;
  const taskId =
    rootEvent && rootEvent.kind === NDKTask.kind ? rootEvent.id : undefined;
  const { draft, saveDraft, clearDraft } = useDraftPersistence({
    threadId,
    taskId,
    enabled: !!rootEvent,
  });

  // Load draft when root event changes
  useEffect(() => {
    if (rootEvent?.id) {
      setMessageInput(draft || "");
    } else {
      setMessageInput("");
    }
  }, [rootEvent?.id, draft]);

  // Save draft whenever input changes
  useEffect(() => {
    if (!rootEvent?.id) return;
    const timeoutId = setTimeout(() => {
      saveDraft(messageInput);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [messageInput, saveDraft, rootEvent?.id]);

  // Detect bech32 entities in message input
  useEffect(() => {
    const entities = findNostrEntities(messageInput);
    // Only keep event-type entities (nevent, note, naddr)
    const eventEntities = entities.filter(
      e => e.type === 'nevent' || e.type === 'note' || e.type === 'naddr'
    );
    setQuotedEvents(eventEntities);
  }, [messageInput]);

  // Handle quoted event author - auto-select if it's an agent
  const handleQuotedEventLoaded = useCallback((pubkey: string) => {
    if (onlineAgents) {
      const agent = onlineAgents.find(a => a.pubkey === pubkey);
      if (agent && !selectedAgent) {
        setSelectedAgent(agent.pubkey);
      }
    }
  }, [onlineAgents, selectedAgent]);

  // Reset agent selection when conversation changes
  useEffect(() => {
    setSelectedAgent(null);
  }, [rootEvent?.id]);

  // Get brainstorm mode settings
  const { getCurrentSession, clearBrainstormSession } = useBrainstormMode();
  const brainstormSession = getCurrentSession();

  // Clear brainstorm session when thread changes or messages exist
  useEffect(() => {
    if (rootEvent || (recentMessages && recentMessages.length > 0)) {
      clearBrainstormSession();
    }
  }, [rootEvent?.id, recentMessages?.length, clearBrainstormSession]);

  // Image upload functionality
  const {
    uploadFiles,
    uploadQueue,
    cancelUpload,
    retryUpload,
    clearCompleted,
    handlePaste,
    uploadStats,
  } = useBlossomUpload();

  const pendingImageUrls = uploadQueue
    .filter((item) => item.status === "completed" && item.url)
    .map((item) => item.url)
    .filter((url): url is string => url !== undefined);

  const showUploadProgress = uploadQueue.length > 0;

  // Mentions functionality
  const mentionProps = useMentions({
    agents: onlineAgents ?? [],
    textareaRef,
    messageInput,
    setMessageInput,
    includeAllProjects: true,
  });

  // Detect @ mentions in the message input
  const mentionedAgents = React.useMemo(() => {
    if (!onlineAgents || !messageInput) return [];
    const mentionRegex = /@([\w-]+)/g;
    const matches = [];
    let match;
    while ((match = mentionRegex.exec(messageInput)) !== null) {
      const mentionSlug = match[1].toLowerCase();
      const agent = onlineAgents.find(
        (a) => a.slug.toLowerCase() === mentionSlug,
      );
      if (agent) {
        matches.push(agent);
      }
    }
    return matches;
  }, [messageInput, onlineAgents]);

  // When replying, automatically set the selected agent to the author of the message being replied to
  useEffect(() => {
    if (replyingTo) {
      setSelectedAgent(replyingTo.pubkey);
    } else if (!mentionedAgents.length) {
      // Only reset to null when reply is cleared AND there are no mentions
      setSelectedAgent(null);
    }
  }, [replyingTo, mentionedAgents.length]);

  // Auto-select the first mentioned agent in the selector
  // This ensures that when a user @mentions an agent, that agent is selected
  // in the agent selector rather than hiding the selector
  React.useEffect(() => {
    if (mentionedAgents.length > 0 && !replyingTo) {
      // Set the selected agent to the first mentioned agent
      setSelectedAgent(mentionedAgents[0].pubkey);
    }
    // Don't reset when mentions are cleared - let other logic handle that
  }, [mentionedAgents, replyingTo]);

  // Check if we're in a brainstorm conversation
  const isInBrainstormConversation = brainstormSession?.enabled || 
    (rootEvent && isBrainstormMessage(rootEvent));
  
  // Show agent selector when not replying and not in brainstorm mode
  // The selector will show the mentioned agent if there is one
  const showAgentSelector = !replyingTo && !isInBrainstormConversation;

  // Determine the default agent based on p-tag logic (same as AgentSelector)
  const defaultAgent = React.useMemo(() => {
    if (!onlineAgents || onlineAgents.length === 0) return null;

    // If there are recent messages, find the most recent non-user agent
    if (recentMessages.length > 0) {
      const recentAgent = [...recentMessages].reverse().find((msg) => {
        const agent = onlineAgents.find((a) => a.pubkey === msg.event.pubkey);
        return agent !== undefined;
      });

      if (recentAgent) {
        return recentAgent.event.pubkey;
      }
    }

    // Otherwise, default to the PM (first agent)
    return onlineAgents[0].pubkey;
  }, [onlineAgents, recentMessages]);

  // Use selected agent or default (same logic as AgentSelector)
  const currentAgent = selectedAgent || defaultAgent;

  // Get the current agent's model from project status
  const currentAgentModel = React.useMemo(() => {
    if (!currentAgent || !projectStatus) return undefined;
    const statusAgent = projectStatus.agents.find(
      (a) => a.pubkey === currentAgent,
    );
    return statusAgent?.model;
  }, [currentAgent, projectStatus]);

  // Build message content with images
  const buildMessageContent = useCallback(() => {
    let content = messageInput;
    const completedUploads = uploadQueue.filter(
      (item) => item.status === "completed",
    );
    if (completedUploads.length > 0) {
      const imageUrls = completedUploads
        .map((upload) => upload.url)
        .filter(Boolean)
        .join("\n");
      if (imageUrls) {
        content = content ? `${content}\n\n${imageUrls}` : imageUrls;
      }
    }
    return content;
  }, [messageInput, uploadQueue]);

  // Create a new thread
  const createThread = useCallback(
    async (
      content: string,
      mentions: AgentInstance[],
      images: ImageUpload[],
    ) => {
      if (!ndk || !user) return null;

      const newThreadEvent = new NDKThread(ndk);
      newThreadEvent.content = content;
      newThreadEvent.title = content.slice(0, 50);

      if (project) newThreadEvent.tag(project.tagReference());

      if (extraTags.length > 0) {
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
      await newThreadEvent.publish();

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
      selectedAgent,
      autoTTS,
      onThreadCreated,
      brainstormSession,
      quotedEvents,
    ],
  );

  // Send a reply
  const sendReply = useCallback(
    async (
      content: string,
      mentions: AgentInstance[],
      images: ImageUpload[],
    ) => {
      if (!ndk || !user || !rootEvent) return null;

      const targetEvent = replyingTo || rootEvent;
      const replyEvent = targetEvent.reply();
      replyEvent.content = content;

      replyEvent.tags = replyEvent.tags.filter((tag) => tag[0] !== "p");

      if (project) {
        const tagId = project.tagId();
        if (tagId) {
          replyEvent.tags.push(["a", tagId]);
        }
      }

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

      mentions.forEach((agent) => {
        replyEvent.tags.push(["p", agent.pubkey]);
      });

      // Extract and add hashtags from reply content
      const hashtagRegex = /#(\w+)/g;
      const hashtags = new Set<string>();
      let match;
      while ((match = hashtagRegex.exec(content)) !== null) {
        hashtags.add(match[1].toLowerCase());
      }
      hashtags.forEach(tag => {
        replyEvent.tags.push(["t", tag]);
      });

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

      if (autoTTS) {
        replyEvent.tags.push(["mode", "voice"]);
      }

      // In brainstorm conversations, preserve brainstorm mode tags and always p-tag the moderator
      if (rootEvent && isBrainstormMessage(rootEvent)) {
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
        const participantTags = rootEvent.tags.filter(tag => tag[0] === "participant");
        participantTags.forEach(participantTag => {
          const hasThisParticipant = replyEvent.tags.some(
            tag => tag[0] === "participant" && tag[1] === participantTag[1]
          );
          if (!hasThisParticipant) {
            replyEvent.tags.push(participantTag);
          }
        });
        
        // P-tag the moderator
        const moderatorPubkey = rootEvent.tagValue("p");
        if (moderatorPubkey) {
          // Check if moderator is not already p-tagged
          const hasModeratorPTag = replyEvent.tags.some(
            tag => tag[0] === "p" && tag[1] === moderatorPubkey
          );
          if (!hasModeratorPTag) {
            replyEvent.tags.push(["p", moderatorPubkey]);
          }
        }
      }
      
      await replyEvent.sign(undefined, { pTags: false });
      await replyEvent.publish();

      return replyEvent;
    },
    [
      ndk,
      user,
      rootEvent,
      project,
      replyingTo,
      selectedAgent,
      recentMessages,
      autoTTS,
    ],
  );

  // Main send handler - publishes directly to Nostr
  const handleSend = useCallback(async () => {
    if (!ndk || !user) {
      console.error("ChatInputArea: Cannot send message without NDK or user");
      return;
    }

    if (!messageInput.trim() && pendingImageUrls.length === 0) {
      return;
    }

    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const content = buildMessageContent();
      const mentions = mentionProps.extractMentions(content);
      const completedUploads = uploadQueue
        .filter((item) => item.status === "completed" && item.url)
        .map((upload) => ({
          url: upload.url!,
          metadata: upload.metadata,
        }));

      setMessageInput("");

      // Send directly to Nostr
      if (!rootEvent) {
        await createThread(content, mentions, completedUploads);
      } else {
        await sendReply(content, mentions, completedUploads);
      }

      // Clear everything after successful send
      clearCompleted();
      clearDraft();
      // Clear selected agent only if there are no mentions in the sent message
      if (!mentions.length) {
        setSelectedAgent(null);
      }
      setQuotedEvents([]);
      clearBrainstormSession(); // Clear brainstorm mode after sending

      if (replyingTo) {
        clearReply();
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    ndk,
    user,
    messageInput,
    pendingImageUrls.length,
    isSubmitting,
    buildMessageContent,
    mentionProps,
    uploadQueue,
    rootEvent,
    createThread,
    sendReply,
    clearCompleted,
    clearDraft,
    replyingTo,
    clearReply,
  ]);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        await uploadFiles(Array.from(files));
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFiles],
  );

  // Handle paste event
  const handlePasteEvent = useCallback(
    (e: React.ClipboardEvent) => {
      handlePaste(e);
    },
    [handlePaste],
  );

  // Handle voice completion - auto send without showing dialog
  const handleVoiceComplete = useCallback(
    async (data: { transcription: string; autoSend?: boolean }) => {
      if (data.transcription.trim()) {
        // If autoSend is true, send immediately without user editing
        if (data.autoSend) {
          const content = data.transcription;
          const mentions = mentionProps.extractMentions(content);
          const completedUploads = uploadQueue
            .filter((item) => item.status === "completed" && item.url)
            .map((upload) => ({
              url: upload.url!,
              metadata: upload.metadata,
            }));

          setIsSubmitting(true);
          try {
            if (!rootEvent) {
              await createThread(content, mentions, completedUploads);
            } else {
              await sendReply(content, mentions, completedUploads);
            }
            setMessageInput("");
            clearCompleted();
            clearDraft();
            toast.success("Voice message sent");
          } catch (error) {
            console.error("Failed to send voice message:", error);
            toast.error("Failed to send voice message");
          } finally {
            setIsSubmitting(false);
            setIsVoiceDialogOpen(false);
            setIsRecording(false);
          }
        } else {
          // Traditional flow - just set the text for user to review
          setMessageInput(data.transcription);
        }
      }
    },
    [
      mentionProps,
      uploadQueue,
      rootEvent,
      createThread,
      sendReply,
      clearCompleted,
      clearDraft,
    ],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && replyingTo) {
      e.preventDefault();
      clearReply();
      return;
    }

    if (mentionProps.showAgentMenu) {
      mentionProps.handleKeyDown(e);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const removeImageUrl = (url: string) => {
    const item = uploadQueue.find((i) => i.url === url);
    if (item) cancelUpload(item.id);
  };

  const isNewThread = !rootEvent;

  return (
    <div
      className={cn(
        "flex-shrink-0 absolute bottom-0 left-0 right-0 z-20",
        isMobile ? "p-3 pb-safe" : "p-4",
        className,
      )}
      onPaste={handlePasteEvent}
    >
      <div
        className={cn(
          "flex flex-col w-full rounded-2xl relative z-20",
          "bg-background/80 backdrop-blur-xl",
          "border border-border/50",
          "shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.2)]",
        )}
      >
        {/* Quoted event previews */}
        <AnimatePresence>
          {quotedEvents.length > 0 && (
            <>
              {quotedEvents.map((entity, index) => (
                <EventPreview
                  key={`${entity.bech32}-${index}`}
                  entity={entity}
                  onRemove={() => {
                    // Remove the bech32 from the message input
                    const regex = new RegExp(`(?:nostr:)?${entity.bech32}`, 'g');
                    const newInput = messageInput.replace(regex, '').trim();
                    setMessageInput(newInput);
                    setQuotedEvents(prev => prev.filter((_, i) => i !== index));
                  }}
                  onEventLoaded={handleQuotedEventLoaded}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Reply preview */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  "flex items-center justify-between border-b border-border/30",
                  isMobile ? "p-2 pb-2" : "p-3 pb-3",
                )}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Reply className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    Replying to
                  </span>
                  <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-full">
                    <NostrProfile
                      pubkey={replyingTo.pubkey}
                      variant="avatar"
                      size="xs"
                      className="h-4 w-4"
                    />
                    <NostrProfile
                      pubkey={replyingTo.pubkey}
                      variant="name"
                      className="text-xs text-primary font-medium"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                    "{replyingTo.content?.substring(0, 50)}
                    {replyingTo.content && replyingTo.content.length > 50
                      ? "..."
                      : ""}
                    "
                  </span>
                </div>
                <Button
                  onClick={clearReply}
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 rounded-full hover:bg-muted"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pending images display */}
        <AnimatePresence>
          {pendingImageUrls.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div
                className={cn(
                  "flex flex-wrap gap-2 border-b border-border/30",
                  isMobile ? "p-2 pb-3" : "p-3 pb-4",
                )}
              >
                {pendingImageUrls.map((url, index) => {
                  const uploadItem = uploadQueue.find(
                    (item) => item.url === url,
                  );
                  return (
                    <motion.div
                      key={url}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="relative group"
                    >
                      <ImagePreview
                        url={url}
                        alt="Pending upload"
                        className="w-16 h-16 rounded-lg border border-border/50"
                        showLightbox={false}
                      />

                      {uploadItem && uploadItem.status === "uploading" && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <div className="text-white text-xs font-medium">
                            {uploadItem.progress}%
                          </div>
                        </div>
                      )}

                      <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                        {uploadItem?.status === "failed" && (
                          <button
                            onClick={() => retryUpload(uploadItem.id)}
                            className="bg-orange-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                            title="Retry upload"
                          >
                            <svg
                              className="w-2.5 h-2.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                              />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => removeImageUrl(url)}
                          className="bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Textarea area */}
        <div
          className={cn("relative w-full", isMobile ? "p-2 pb-1" : "p-3 pb-2")}
        >
          <ChatMentionMenu
            showAgentMenu={mentionProps.showAgentMenu}
            filteredAgents={mentionProps.filteredAgents}
            filteredProjectGroups={mentionProps.filteredProjectGroups}
            selectedAgentIndex={mentionProps.selectedAgentIndex}
            insertMention={mentionProps.insertMention}
          />

          <Textarea
            id="chat-input-field"
            ref={textareaRef}
            value={messageInput}
            onChange={(e) => mentionProps.handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isNewThread ? "Start a new conversation..." : "Type a message..."
            }
            disabled={disabled || isSubmitting}
            className={cn(
              "resize-none bg-transparent border-0 !focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground/60",
              "transition-all duration-200 !shadow-none w-full",
              isMobile
                ? "min-h-[40px] text-[15px] py-2.5 px-2 leading-relaxed"
                : "min-h-[56px] text-base py-3 px-3",
            )}
          />
        </div>

        {/* Bottom controls row */}
        <div
          className={cn(
            "flex items-center justify-between w-full border-t border-border/30",
            isMobile ? "gap-1.5 p-2 pt-2" : "gap-2 p-3 pt-3",
          )}
        >
          <div
            className={cn("flex items-center", isMobile ? "gap-1" : "gap-2")}
          >
            {onlineAgents &&
              onlineAgents.length > 0 &&
              (isInBrainstormConversation ? (
                // In brainstorm mode, show the participants or moderator info
                <div className="flex items-center gap-1.5">
                  {brainstormSession?.enabled ? (
                    // New brainstorm session - show configured participants
                    <>
                      {/* Show moderator */}
                      {brainstormSession.moderatorPubkey && (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                            "bg-purple-600/20 border border-purple-600/30",
                            "text-sm",
                          )}
                        >
                          <NostrProfile
                            pubkey={brainstormSession.moderatorPubkey}
                            variant="avatar"
                            size="xs"
                            className="flex-shrink-0"
                          />
                          <NostrProfile
                            pubkey={brainstormSession.moderatorPubkey}
                            variant="name"
                            className="text-xs font-medium"
                          />
                          <span className="text-xs text-purple-600 font-medium">(mod)</span>
                        </div>
                      )}
                      {/* Show participants */}
                      {brainstormSession.participantPubkeys.map((participantPubkey) => {
                        const agent = onlineAgents.find(a => a.pubkey === participantPubkey);
                        if (!agent) return null;
                        return (
                          <div
                            key={participantPubkey}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                              "bg-accent/50 border border-border/50",
                              "text-sm",
                            )}
                          >
                            <NostrProfile
                              pubkey={participantPubkey}
                              variant="avatar"
                              size="xs"
                              fallback={agent.slug}
                              className="flex-shrink-0"
                            />
                            <span className="text-xs font-medium">{agent.slug}</span>
                          </div>
                        );
                      })}
                    </>
                  ) : rootEvent && isBrainstormMessage(rootEvent) ? (
                    // Replying to brainstorm conversation - show all participants
                    <>
                      {/* Show moderator */}
                      {getBrainstormModerator(rootEvent) && (
                        <div
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                            "bg-purple-600/20 border border-purple-600/30",
                            "text-sm",
                          )}
                        >
                          <NostrProfile
                            pubkey={getBrainstormModerator(rootEvent)!}
                            variant="avatar"
                            size="xs"
                            className="flex-shrink-0"
                          />
                          <NostrProfile
                            pubkey={getBrainstormModerator(rootEvent)!}
                            variant="name"
                            className="text-xs font-medium"
                          />
                          <span className="text-xs text-purple-600 font-medium">(mod)</span>
                        </div>
                      )}
                      {/* Show participants */}
                      {getBrainstormParticipants(rootEvent).map((participantPubkey) => {
                        const agent = onlineAgents.find(a => a.pubkey === participantPubkey);
                        return (
                          <div
                            key={participantPubkey}
                            className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                              "bg-accent/50 border border-border/50",
                              "text-sm",
                            )}
                          >
                            <NostrProfile
                              pubkey={participantPubkey}
                              variant="avatar"
                              size="xs"
                              fallback={agent?.slug}
                              className="flex-shrink-0"
                            />
                            <NostrProfile
                              pubkey={participantPubkey}
                              variant="name"
                              fallback={agent?.slug}
                              className="text-xs font-medium"
                            />
                          </div>
                        );
                      })}
                    </>
                  ) : null}
                </div>
              ) : showAgentSelector ? (
                <>
                  <AgentSelector
                    onlineAgents={onlineAgents}
                    recentMessages={recentMessages}
                    selectedAgent={selectedAgent}
                    onAgentSelect={setSelectedAgent}
                    disabled={disabled || isSubmitting}
                    className="flex-shrink-0"
                  />
                  {currentAgent && projectStatus && project && (
                    <ModelSelector
                      selectedAgentPubkey={currentAgent}
                      selectedAgentModel={currentAgentModel}
                      availableModels={projectStatus.models}
                      project={project}
                      disabled={disabled || isSubmitting}
                      className="flex-shrink-0"
                    />
                  )}
                </>
              ) : (
                <div className="flex items-center gap-1.5">
                  {/* Show reply destination as a pill */}
                  {replyingTo && (
                    <div
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                        "bg-primary/10 border border-primary/20",
                        "text-sm",
                      )}
                    >
                      <NostrProfile
                        pubkey={replyingTo.pubkey}
                        variant="avatar"
                        size="xs"
                        className="flex-shrink-0"
                      />
                      <NostrProfile
                        pubkey={replyingTo.pubkey}
                        variant="name"
                        className="text-xs font-medium"
                      />
                    </div>
                  )}
                </div>
              ))}

            <Button
              onClick={() => fileInputRef.current?.click()}
              size="icon"
              variant="ghost"
              disabled={disabled || isSubmitting}
              className={cn(
                "rounded-sm transition-all duration-200",
                "hover:bg-accent/80",
                isMobile ? "h-8 w-8" : "h-9 w-9",
              )}
              title="Attach image"
            >
              <Paperclip
                className={cn(
                  "transition-colors",
                  isMobile ? "h-3.5 w-3.5" : "h-4 w-4",
                )}
              />
            </Button>

            {showVoiceButton && (
              <Button
                onClick={() => {
                  setIsRecording(true);
                  setIsVoiceDialogOpen(true);
                }}
                size="icon"
                variant="ghost"
                disabled={disabled || isSubmitting || isRecording}
                className={cn(
                  "rounded-sm transition-all duration-200",
                  "hover:bg-accent/80",
                  isMobile ? "h-8 w-8" : "h-9 w-9",
                  isRecording && "bg-red-500/20 hover:bg-red-500/30",
                )}
              >
                <Mic className={cn(
                  isMobile ? "h-3.5 w-3.5" : "h-4 w-4",
                  isRecording && "text-red-500 animate-pulse"
                )} />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Brainstorm Mode Button - show for new conversations, hide only after sending */}
            {!rootEvent && (!recentMessages || recentMessages.length === 0) && (
              <BrainstormModeButton
                onlineAgents={onlineAgents}
                disabled={disabled || isSubmitting}
              />
            )}

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={handleSend}
              disabled={
                disabled ||
                isSubmitting ||
                (!messageInput.trim() && pendingImageUrls.length === 0)
              }
              size="icon"
              className={cn(
                "rounded-lg transition-all duration-200",
                "bg-primary text-primary-foreground",
                "hover:bg-primary/90",
                "disabled:opacity-50 disabled:bg-muted disabled:text-muted-foreground",
                isMobile ? "h-8 w-8" : "h-9 w-9",
              )}
            >
              <Send
                className={cn(
                  "transition-colors",
                  isMobile ? "h-3.5 w-3.5" : "h-4 w-4",
                )}
              />
            </Button>
          </div>
        </div>
      </div>

      {/* Voice Dialog */}
      <VoiceDialog
        open={isVoiceDialogOpen}
        onOpenChange={(open) => {
          setIsVoiceDialogOpen(open);
          if (!open) {
            setIsRecording(false);
          }
        }}
        onComplete={handleVoiceComplete}
        conversationId={rootEvent?.id}
        projectId={project?.tagId()}
        publishAudioEvent={true}
        autoRecordAndSend={isRecording}
      />

      {/* Upload Queue Overlay */}
      <AnimatePresence>
        {showUploadProgress && uploadStats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <ImageUploadQueue />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
