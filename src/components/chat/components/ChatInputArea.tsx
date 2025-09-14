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

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  // When replying, automatically set the selected agent to the author of the message being replied to
  useEffect(() => {
    if (replyingTo) {
      setSelectedAgent(replyingTo.pubkey);
    } else {
      // Reset to null when reply is cleared to allow auto-selection
      setSelectedAgent(null);
    }
  }, [replyingTo]);

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

  const showAgentSelector = mentionedAgents.length === 0 && !replyingTo;

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

      if (autoTTS) {
        newThreadEvent.tags.push(["mode", "voice"]);
      }

      await newThreadEvent.sign();
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

      await replyEvent.sign();
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
      setSelectedAgent(null);
      setQuotedEvents([]);

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

  // Handle voice completion
  const handleVoiceComplete = useCallback(
    async (data: { transcription: string }) => {
      if (data.transcription.trim()) {
        setMessageInput(data.transcription);
        // Auto-send voice messages
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
        } catch (error) {
          console.error("Failed to send voice message:", error);
          toast.error("Failed to send voice message");
        } finally {
          setIsSubmitting(false);
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
        "flex-shrink-0 absolute bottom-0 left-0 right-0",
        isMobile ? "p-3 pb-safe" : "p-4",
        className,
      )}
      onPaste={handlePasteEvent}
    >
      <div
        className={cn(
          "flex flex-col w-full rounded-2xl",
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
              (showAgentSelector ? (
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
                  {/* Show mentioned agents */}
                  {mentionedAgents.map((agent) => (
                    <div
                      key={agent.pubkey}
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full",
                        "bg-accent/50 border border-border/50",
                        "text-sm",
                      )}
                    >
                      <NostrProfile
                        pubkey={agent.pubkey}
                        variant="avatar"
                        size="xs"
                        fallback={agent.slug}
                        className="flex-shrink-0"
                      />
                      <span className="text-xs font-medium">@{agent.slug}</span>
                    </div>
                  ))}
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

            {!isMobile && showVoiceButton && (
              <Button
                onClick={() => setIsVoiceDialogOpen(true)}
                size="icon"
                variant="ghost"
                disabled={disabled || isSubmitting}
                className={cn(
                  "rounded-sm transition-all duration-200",
                  "hover:bg-accent/80",
                  "h-9 w-9",
                )}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex items-center">
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
        onOpenChange={setIsVoiceDialogOpen}
        onComplete={handleVoiceComplete}
        conversationId={rootEvent?.id}
        projectId={project?.tagId()}
        publishAudioEvent={true}
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
