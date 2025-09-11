import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useBlossomUpload } from '@/hooks/useBlossomUpload';
import { useMentions } from '@/hooks/useMentions';
import { useDraftPersistence } from '@/hooks/useDraftPersistence';
import type { NDKProject } from '@/lib/ndk-events/NDKProject';
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks';
import type { AgentInstance } from '@/types/agent';
import { NDKTask } from '@/lib/ndk-events/NDKTask';

/**
 * Hook for managing chat input state and handlers
 */
export function useChatInput(
  _project: NDKProject | null | undefined,
  rootEvent: NDKEvent | null,
  projectAgents: AgentInstance[] | null,
  textareaRef: React.RefObject<HTMLTextAreaElement | null> | null,
  includeAllProjects: boolean = false
) {
  // Determine if root event is a task or thread for draft persistence
  const threadId = rootEvent && rootEvent.kind !== NDKTask.kind ? rootEvent.id : undefined;
  const taskId = rootEvent && rootEvent.kind === NDKTask.kind ? rootEvent.id : undefined;
  
  // Use draft persistence - this hook properly isolates drafts by thread/task ID
  const { draft, saveDraft, clearDraft } = useDraftPersistence({
    threadId,
    taskId,
    enabled: !!rootEvent // Only enable if we have a root event
  });
  
  // Initialize state with empty string
  const [messageInput, setMessageInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load draft when root event changes
  useEffect(() => {
    // When switching conversations, load the draft for that specific conversation
    if (rootEvent?.id) {
      // The draft hook will return the correct draft for this thread/task
      setMessageInput(draft || '');
    } else {
      // No root event, clear the input
      setMessageInput('');
    }
  }, [rootEvent?.id, draft]);
  
  // Save draft whenever input changes
  useEffect(() => {
    // Only save if we have a root event (conversation context)
    if (!rootEvent?.id) return;
    
    const timeoutId = setTimeout(() => {
      saveDraft(messageInput);
    }, 500); // Debounce saving to avoid too frequent writes
    
    return () => clearTimeout(timeoutId);
  }, [messageInput, saveDraft, rootEvent?.id]);

  // Image upload functionality using Blossom
  const {
    uploadFiles,
    uploadQueue,
    cancelUpload,
    retryUpload,
    clearCompleted,
    handlePaste,
    uploadStats,
  } = useBlossomUpload();
  
  // Derived values from Blossom upload
  const pendingImageUrls = uploadQueue
    .filter(item => item.status === 'completed' && item.url)
    .map(item => item.url)
    .filter((url): url is string => url !== undefined);
  const showUploadProgress = uploadQueue.length > 0;
  const setShowUploadProgress = () => {}; // No-op for compatibility
  const removeImageUrl = (url: string) => {
    // Find and cancel/remove the upload with this URL
    const item = uploadQueue.find(i => i.url === url);
    if (item) cancelUpload(item.id);
  };
  const getCompletedUploads = () => uploadQueue.filter(item => item.status === 'completed');
  const clearUploads = clearCompleted;

  // Mentions functionality - make agents optional
  const mentionProps = useMentions({
    agents: projectAgents ?? [],
    textareaRef: textareaRef ?? { current: null },
    messageInput,
    setMessageInput,
    includeAllProjects,
  });

  // Build the final message content
  const buildMessageContent = useCallback(() => {
    let content = messageInput;
    
    // Add image URLs to content if any - use uploadQueue directly to avoid dependency on getCompletedUploads
    const completedUploads = uploadQueue.filter(item => item.status === 'completed');
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
  }, [messageInput, uploadQueue]);

  // Clear all input - memoized with stable dependencies
  const clearInput = useCallback(() => {
    setMessageInput('');
    clearCompleted(); // Use the stable clearCompleted reference
    clearDraft(); // Clear the draft when sending message
  }, [clearCompleted, clearDraft]);

  // Handle submit - optimized dependencies
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
  }, [messageInput, pendingImageUrls.length, isSubmitting, buildMessageContent, clearInput]);

  return useMemo(() => ({
    messageInput,
    setMessageInput,
    pendingImageUrls,
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
  }), [
    messageInput,
    setMessageInput,
    pendingImageUrls,
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
  ]);
}