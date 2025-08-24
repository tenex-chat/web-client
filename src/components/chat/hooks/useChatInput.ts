import { useState, useCallback } from 'react';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useMentions } from '@/hooks/useMentions';
import type { NDKProject } from '@/lib/ndk-events/NDKProject';
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks';
import type { AgentInstance } from '@/types/agent';

/**
 * Hook for managing chat input state and handlers
 */
export function useChatInput(
  _project: NDKProject,
  _rootEvent: NDKEvent | null,
  projectAgents: AgentInstance[],
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  includeAllProjects: boolean = false
) {
  const [messageInput, setMessageInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Image upload functionality
  const {
    pendingImageUrls,
    uploadQueue,
    uploadStats,
    showUploadProgress,
    setShowUploadProgress,
    uploadFiles,
    handlePaste,
    removeImageUrl,
    cancelUpload,
    retryUpload,
    getCompletedUploads,
    clearUploads,
  } = useImageUpload();

  // Mentions functionality
  const mentionProps = useMentions({
    agents: projectAgents,
    textareaRef,
    messageInput,
    setMessageInput,
    includeAllProjects,
  });

  // Build the final message content
  const buildMessageContent = useCallback(() => {
    let content = messageInput;
    
    // Add image URLs to content if any
    const completedUploads = getCompletedUploads();
    if (completedUploads.length > 0) {
      const imageUrls = completedUploads
        .map(upload => upload.url)
        .filter(Boolean)
        .join('\n');
      
      if (imageUrls) {
        content = content ? `${content}\n\n${imageUrls}` : imageUrls;
      }
    }
    
    return content;
  }, [messageInput, getCompletedUploads]);

  // Clear all input
  const clearInput = useCallback(() => {
    setMessageInput('');
    clearUploads();
  }, [clearUploads]);

  // Handle submit
  const handleSubmit = useCallback(async (onSubmit: (message: string) => Promise<void>) => {
    if (!messageInput.trim() && pendingImageUrls.length === 0) return;
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const content = buildMessageContent();
      await onSubmit(content);
      clearInput();
    } finally {
      setIsSubmitting(false);
    }
  }, [messageInput, pendingImageUrls, isSubmitting, buildMessageContent, clearInput]);

  return {
    messageInput,
    setMessageInput,
    pendingImageUrls,
    uploadQueue,
    uploadStats,
    showUploadProgress,
    setShowUploadProgress,
    uploadFiles,
    handlePaste,
    removeImageUrl,
    cancelUpload,
    retryUpload,
    getCompletedUploads,
    mentionProps,
    buildMessageContent,
    clearInput,
    handleSubmit,
    isSubmitting
  };
}