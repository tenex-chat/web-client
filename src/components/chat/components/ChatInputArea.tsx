import React, { useRef, useCallback, memo, useState } from "react";
import { Send, Mic, Paperclip, X } from "lucide-react";
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
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

interface ChatInputAreaProps {
  project?: NDKProject | null;
  inputProps: any; // The entire inputProps object from useChatInput
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onSend: (content: string, mentions: any[], imageUploads: any[]) => void;
  isNewThread: boolean;
  disabled?: boolean;
  showVoiceButton?: boolean;
  canSend: boolean;
  localRootEvent: NDKEvent | null;
  onVoiceComplete: (data: { transcription: string }) => void;
}

/**
 * Chat input area component
 * Handles message input, file attachments, and mentions
 */
export const ChatInputArea = memo(function ChatInputArea({
  project,
  inputProps,
  textareaRef,
  onSend,
  isNewThread,
  disabled = false,
  showVoiceButton = true,
  canSend,
  localRootEvent,
  onVoiceComplete,
}: ChatInputAreaProps) {
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  // Focus input on reply (exposed through parent)
  React.useImperativeHandle(inputProps.inputRef, () => ({
    focus: () => textareaRef.current?.focus(),
  }), []);

  // Destructure from inputProps
  const {
    messageInput,
    setMessageInput,
    pendingImageUrls,
    removeImageUrl,
    uploadQueue,
    uploadFiles,
    handlePaste,
    cancelUpload,
    retryUpload,
    setShowUploadProgress,
    mentionProps,
    buildMessageContent,
    clearInput,
    getCompletedUploads,
  } = inputProps;
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Update mention props with the textarea ref and setMessageInput
  const mentionPropsWithRef = {
    ...mentionProps,
    textareaRef,
    handleInputChange: (value: string) => {
      setMessageInput(value);
      mentionProps.handleInputChange(value);
    },
  };

  // Handle sending with all the logic local to this component
  const handleSend = useCallback(() => {
    if (!canSend || (!messageInput.trim() && pendingImageUrls.length === 0)) {
      return;
    }

    const content = buildMessageContent();
    const mentions = mentionProps.extractMentions(content);
    const completedUploads = getCompletedUploads();
    const imageUploads = completedUploads.map((upload) => ({
      url: upload.url!,
      metadata: upload.metadata,
    }));

    onSend(content, mentions, imageUploads);
    clearInput();
  }, [canSend, messageInput, pendingImageUrls, buildMessageContent, mentionProps, getCompletedUploads, onSend, clearInput]);

  // Handle file selection from input
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        setShowUploadProgress(true);
        await uploadFiles(Array.from(files));
      }
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFiles, setShowUploadProgress],
  );

  // Enhanced paste handler
  const handlePasteEvent = useCallback(
    (e: React.ClipboardEvent) => {
      handlePaste(e);
      setShowUploadProgress(true);
    },
    [handlePaste, setShowUploadProgress],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // First check for mention autocomplete
    if (mentionPropsWithRef.showAgentMenu) {
      mentionPropsWithRef.handleKeyDown(e);
      return;
    }

    // Handle sending with Enter (without shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={cn("flex-shrink-0 absolute bottom-0 left-0 right-0", isMobile ? "p-3 pb-safe" : "p-4")}
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
        {/* Enhanced pending images display with animation */}
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

                      {/* Upload status overlay */}
                      {uploadItem && uploadItem.status === "uploading" && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <div className="text-white text-xs font-medium">
                            {uploadItem.progress}%
                          </div>
                        </div>
                      )}

                      {/* Actions */}
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
                          onClick={() => {
                            removeImageUrl(url);
                            if (uploadItem) {
                              cancelUpload(uploadItem.id);
                            }
                          }}
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

        <div
          className={cn(
            "flex items-end w-full",
            isMobile ? "gap-1.5 p-2" : "gap-2 p-3",
          )}
        >
          <div className="flex-1 relative">
            {/* Mention Autocomplete Menu */}
            <ChatMentionMenu
              showAgentMenu={mentionPropsWithRef.showAgentMenu}
              filteredAgents={mentionPropsWithRef.filteredAgents}
              filteredProjectGroups={mentionPropsWithRef.filteredProjectGroups}
              selectedAgentIndex={mentionPropsWithRef.selectedAgentIndex}
              insertMention={mentionPropsWithRef.insertMention}
            />

            <Textarea
              ref={textareaRef}
              value={messageInput}
              onChange={(e) =>
                mentionPropsWithRef.handleInputChange(e.target.value)
              }
              onKeyDown={handleKeyDown}
              placeholder={
                isNewThread
                  ? "Start a new conversation..."
                  : "Type a message..."
              }
              disabled={disabled}
              className={cn(
                "resize-none bg-transparent border-0 !focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0",
                "placeholder:text-muted-foreground/60",
                "transition-all duration-200 !shadow-none",
                isMobile
                  ? "min-h-[40px] text-[15px] py-2.5 px-1 leading-relaxed"
                  : "min-h-[56px] text-base py-3 px-2",
              )}
            />
          </div>

          <div
            className={cn("flex items-center", isMobile ? "gap-1" : "gap-2")}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <Button
              onClick={() => fileInputRef.current?.click()}
              size="icon"
              variant="ghost"
              disabled={disabled}
              className={cn(
                "rounded-full transition-all duration-200",
                "hover:bg-accent/80 hover:scale-110",
                "active:scale-95",
                isMobile ? "h-9 w-9" : "h-10 w-10",
              )}
              title="Attach image"
            >
              <Paperclip
                className={cn(
                  "transition-colors",
                  isMobile ? "h-4 w-4" : "h-4.5 w-4.5",
                )}
              />
            </Button>

            {!isMobile && showVoiceButton && (
              <Button
                onClick={() => setIsVoiceDialogOpen(true)}
                size="icon"
                variant="ghost"
                disabled={disabled}
                className={cn(
                  "rounded-full transition-all duration-200",
                  "hover:bg-accent/80 hover:scale-110",
                  "active:scale-95",
                  "h-10 w-10",
                )}
              >
                <Mic className="h-4.5 w-4.5" />
              </Button>
            )}

            <Button
              onClick={handleSend}
              disabled={disabled || !messageInput.trim() && pendingImageUrls.length === 0}
              size="icon"
              className={cn(
                "rounded-full transition-all duration-200",
                "bg-primary hover:bg-primary/90",
                "hover:scale-110 active:scale-95",
                "disabled:opacity-50 disabled:hover:scale-100",
                "shadow-sm hover:shadow-md",
                isMobile ? "h-9 w-9" : "h-10 w-10",
              )}
            >
              <Send
                className={cn(
                  "transition-transform",
                  canSend ? "translate-x-0.5" : "",
                  isMobile ? "h-4 w-4" : "h-4.5 w-4.5",
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
        onComplete={onVoiceComplete}
        conversationId={localRootEvent?.id}
        projectId={project?.tagId()}
        publishAudioEvent={true}
      />

      {/* Upload Queue Overlay */}
      <AnimatePresence>
        {inputProps.showUploadProgress &&
          inputProps.uploadStats.total > 0 && (
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
