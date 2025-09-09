import { useState, useCallback } from 'react'
import { NDKEvent, NDKThread, useNDK, useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { Message } from './useChatMessages'
import type { AgentInstance } from '@/types/agent'

export interface ImageUpload {
  url: string
  metadata?: {
    sha256: string
    mimeType: string
    size: number
    blurhash?: string
  }
}

/**
 * Hook for managing thread operations
 * Handles creating threads, sending replies, and NDK event tagging
 */
export function useThreadManagement(
  project: NDKProject | null | undefined,
  initialRootEvent: NDKEvent | null,
  extraTags?: string[][],
  onThreadCreated?: (thread: NDKEvent) => void,
  onlineAgents?: { pubkey: string; slug: string }[],
  replyingTo?: NDKEvent | null
) {
  const { ndk } = useNDK()
  const user = useNDKCurrentUser()
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(initialRootEvent)

  const createThread = useCallback(async (
    content: string,
    mentions: AgentInstance[],
    images: ImageUpload[],
    autoTTS: boolean
  ) => {
    if (!ndk || !user) return null

    // Create the initial thread event (kind 11)
    const newThreadEvent = new NDKThread(ndk)
    newThreadEvent.content = content
    newThreadEvent.title = content.slice(0, 50)

    if (project) newThreadEvent.tag(project.tagReference());

    // Add extra tags if provided
    if (extraTags && extraTags.length > 0) {
      newThreadEvent.tags.push(...extraTags)
    }

    // Add image tags for each uploaded image
    images.forEach(upload => {
      if (upload.metadata) {
        newThreadEvent.tags.push([
          'image',
          upload.metadata.sha256,
          upload.url,
          upload.metadata.mimeType,
          upload.metadata.size.toString()
        ])
        if (upload.metadata.blurhash) {
          newThreadEvent.tags.push(['blurhash', upload.metadata.blurhash])
        }
      }
    })

    // Add p-tags for mentioned agents
    mentions.forEach(agent => {
      newThreadEvent.tags.push(['p', agent.pubkey])
    })
    
    // If no mentions, add first agent (PM) p-tag when starting new conversation
    if (mentions.length === 0 && onlineAgents && onlineAgents.length > 0) {
      // First agent in the list is the project manager
      const projectManager = onlineAgents[0]
      newThreadEvent.tags.push(['p', projectManager.pubkey])
    }
    
    // Log warning if there are unresolved mentions
    const hasUnresolvedMentions = /@[\w-]+/.test(content) && mentions.length === 0
    if (hasUnresolvedMentions) {
      // Silent warning - mentions might be for agents not in this project
    }

    // Add voice mode tag if auto-TTS is enabled
    if (autoTTS) {
      newThreadEvent.tags.push(['mode', 'voice'])
    }

    await newThreadEvent.sign()
    setLocalRootEvent(newThreadEvent)
    await newThreadEvent.publish()
    
    // Notify parent component about the new thread
    if (onThreadCreated) {
      onThreadCreated(newThreadEvent)
    }

    return newThreadEvent
  }, [ndk, user, project, extraTags, onThreadCreated, onlineAgents])

  const sendReply = useCallback(async (
    content: string,
    mentions: AgentInstance[],
    images: ImageUpload[],
    autoTTS: boolean,
    recentMessages: Message[]
  ) => {
    if (!ndk || !user || !localRootEvent) return null

    // If replying to a specific message, use that as the reply target
    // Otherwise reply to the thread root
    const targetEvent = replyingTo || localRootEvent
    
    // Send a reply to the target event
    const replyEvent = targetEvent.reply()
    replyEvent.content = content

    // Remove all p-tags that NDK's .reply() generated
    replyEvent.tags = replyEvent.tags.filter((tag) => tag[0] !== "p")

    // Add project tag if project exists
    if (project) {
      const tagId = project.tagId()
      if (tagId) {
        replyEvent.tags.push(['a', tagId])
      }
    }
    
    // Add image tags for each uploaded image
    images.forEach(upload => {
      if (upload.metadata) {
        replyEvent.tags.push([
          'image',
          upload.metadata.sha256,
          upload.url,
          upload.metadata.mimeType,
          upload.metadata.size.toString()
        ])
        if (upload.metadata.blurhash) {
          replyEvent.tags.push(['blurhash', upload.metadata.blurhash])
        }
      }
    })

    // Add p-tags for mentioned agents
    mentions.forEach(agent => {
      replyEvent.tags.push(['p', agent.pubkey])
    })

    // Check if there are @ mentions in the content that weren't resolved
    const hasUnresolvedMentions = /@[\w-]+/.test(content) && mentions.length === 0
    
    // Only auto-tag the most recent non-user if there are NO @ mentions at all
    // (resolved or unresolved) in the content
    if (!hasUnresolvedMentions && mentions.length === 0 && recentMessages.length > 0) {
      const mostRecentNonUserMessage = [...recentMessages]
        .reverse()
        .find(msg => msg.event.pubkey !== user.pubkey)
      
      if (mostRecentNonUserMessage) {
        replyEvent.tags.push(['p', mostRecentNonUserMessage.event.pubkey])
      }
    }

    // Add voice mode tag if auto-TTS is enabled
    if (autoTTS) {
      replyEvent.tags.push(['mode', 'voice'])
    }

    await replyEvent.sign()
    await replyEvent.publish()

    return replyEvent
  }, [ndk, user, localRootEvent, project, replyingTo])

  const sendMessage = useCallback(async (
    content: string,
    mentions: AgentInstance[],
    images: ImageUpload[],
    autoTTS: boolean,
    recentMessages: Message[]
  ) => {
    if (!localRootEvent) {
      return createThread(content, mentions, images, autoTTS)
    } else {
      return sendReply(content, mentions, images, autoTTS, recentMessages)
    }
  }, [localRootEvent, createThread, sendReply])

  return {
    localRootEvent,
    setLocalRootEvent,
    createThread,
    sendReply,
    sendMessage
  }
}