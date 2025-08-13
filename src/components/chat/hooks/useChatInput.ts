import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useDraftMessages } from '@/stores/draftMessages'
import { useBlossomUpload } from '@/hooks/useBlossomUpload'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks'

interface AgentInstance {
  pubkey: string
  name: string
}

/**
 * Hook for managing chat input state
 * Handles drafts, file uploads, and mentions
 */
export function useChatInput(
  project: NDKProject,
  rootEvent: NDKEvent | null,
  agents: AgentInstance[]
) {
  const [messageInput, setMessageInput] = useState('')
  const { setDraft, getDraft, clearDraft } = useDraftMessages()
  
  // Compute the conversation ID for draft storage
  const conversationId = useMemo(() => {
    return rootEvent?.id || `${project.dTag}-new`
  }, [rootEvent?.id, project.dTag])
  
  // Restore draft when conversation changes
  useEffect(() => {
    const draft = getDraft(conversationId)
    if (draft) {
      setMessageInput(draft)
    } else {
      setMessageInput('')
    }
  }, [conversationId, getDraft])
  
  // Save draft as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messageInput.trim()) {
        setDraft(conversationId, messageInput)
      } else {
        clearDraft(conversationId)
      }
    }, 300) // Save after 300ms of no typing
    
    return () => clearTimeout(timer)
  }, [messageInput, conversationId, setDraft, clearDraft])

  // Upload handling
  const { 
    uploadFiles, 
    uploadQueue,
    handlePaste,
    uploadStats,
    cancelUpload,
    retryUpload
  } = useBlossomUpload()
  
  const [showUploadProgress, setShowUploadProgress] = useState(false)
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([])

  // Derive pending image URLs from upload queue
  const pendingImageUrls = useMemo(() => {
    return uploadQueue
      .filter(item => item.status === 'completed' && item.url)
      .map(item => item.url!)
      .filter(url => !removedImageUrls.includes(url))
  }, [uploadQueue, removedImageUrls])

  // Create a ref that will be passed from component
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  // Mention autocomplete
  const mentionProps = useMentionAutocomplete(
    agents,
    messageInput,
    setMessageInput,
    textareaRef as React.RefObject<HTMLTextAreaElement>
  )

  // Clear input after sending
  const clearInput = useCallback(() => {
    setMessageInput('')
    setRemovedImageUrls([])
    clearDraft(conversationId)
  }, [conversationId, clearDraft])

  // Build message content with images
  const buildMessageContent = useCallback(() => {
    let content = messageInput
    
    // Append image URLs to the message content
    if (pendingImageUrls.length > 0) {
      if (content) content += '\n\n'
      pendingImageUrls.forEach(url => {
        content += `![image](${url})\n`
      })
    }
    
    return content
  }, [messageInput, pendingImageUrls])

  // Get completed uploads for tagging
  const getCompletedUploads = useCallback(() => {
    return uploadQueue.filter(item => 
      item.status === 'completed' && 
      item.url && 
      pendingImageUrls.includes(item.url)
    )
  }, [uploadQueue, pendingImageUrls])

  // Handle removing an image URL
  const removeImageUrl = useCallback((url: string) => {
    setRemovedImageUrls(prev => [...prev, url])
  }, [])

  return {
    messageInput,
    setMessageInput,
    pendingImageUrls,
    removeImageUrl,
    showUploadProgress,
    setShowUploadProgress,
    uploadFiles,
    uploadQueue,
    handlePaste,
    uploadStats,
    cancelUpload,
    retryUpload,
    mentionProps,
    clearInput,
    buildMessageContent,
    getCompletedUploads,
    conversationId
  }
}