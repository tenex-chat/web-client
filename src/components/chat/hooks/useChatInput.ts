import { useState, useEffect, useMemo, useCallback } from 'react'
import { useDraftMessages } from '@/stores/draftMessages'
import { useBlossomUpload } from '@/hooks/useBlossomUpload'
import { useMentionAutocomplete } from '@/hooks/useMentionAutocomplete'
import { useAllProjectsOnlineAgentsGrouped } from '@/hooks/useAllProjectsOnlineAgents'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks'
import type { AgentInstance, ProjectGroup } from '@/types/agent'
import { getProjectDisplayName, transformAgentData } from '@/lib/utils/agentUtils'

/**
 * Hook for managing chat input state
 * Handles drafts, file uploads, and mentions
 */
export function useChatInput(
  project: NDKProject,
  rootEvent: NDKEvent | null,
  agents: AgentInstance[],
  textareaRef: React.RefObject<HTMLTextAreaElement | null>,
  includeAllProjects = false
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
  
  // Get all project agents grouped by project
  const allProjectGroups = useAllProjectsOnlineAgentsGrouped()
  
  // Create project groups for hierarchical display
  const projectGroups = useMemo((): ProjectGroup[] => {
    if (!includeAllProjects) return []
    
    const groups: ProjectGroup[] = []
    
    // Add current project group (always expanded, no project prefix)
    if (agents.length > 0) {
      groups.push({
        projectName: getProjectDisplayName(project),
        projectDTag: project.dTag || '',
        agents,
        isCurrentProject: true
      })
    }
    
    // Add other project groups
    allProjectGroups.forEach(group => {
      // Skip current project (already added above)
      if (group.projectDTag === project.dTag) return
      
      groups.push({
        projectName: group.projectName,
        projectDTag: group.projectDTag,
        agents: group.agents.map(a => ({
          pubkey: a.pubkey,
          name: a.name,
          projectName: group.projectName,
          projectDTag: group.projectDTag
        }))
      })
    })
    
    return groups
  }, [agents, allProjectGroups, includeAllProjects, project])
  
  // Flatten agents for simple display (backwards compatibility)
  const agentsForMentions = useMemo(() => {
    if (projectGroups.length > 0) {
      // Flatten all agents from all groups
      return projectGroups.flatMap(g => g.agents)
    }
    return agents
  }, [agents, projectGroups])
  
  // Mention autocomplete with project groups
  const mentionProps = useMentionAutocomplete(
    agentsForMentions,
    messageInput,
    setMessageInput,
    textareaRef,
    projectGroups
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
    
    // Keep @mentions as-is (don't replace with nostr:npub format)
    // The mentions are already in the correct @agentname format
    // We want to preserve the human-readable @agent-name format
    
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