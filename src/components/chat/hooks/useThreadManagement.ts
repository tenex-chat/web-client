import { useState, useCallback } from 'react'
import { NDKEvent, NDKThread } from '@nostr-dev-kit/ndk-hooks'
import { useNDK, useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { Message } from './useChatMessages'

export interface AgentMention {
  pubkey: string
  name: string
}

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
  project: NDKProject,
  initialRootEvent: NDKEvent | null,
  onThreadCreated?: (threadId: string) => void
) {
  const { ndk } = useNDK()
  const user = useNDKCurrentUser()
  const [localRootEvent, setLocalRootEvent] = useState<NDKEvent | null>(initialRootEvent)

  const createThread = useCallback(async (
    content: string,
    mentions: AgentMention[],
    images: ImageUpload[],
    autoTTS: boolean
  ) => {
    if (!ndk || !user) return null

    // Create the initial thread event (kind 11)
    const newThreadEvent = new NDKThread(ndk)
    newThreadEvent.content = content
    newThreadEvent.tags = [
      ['title', content.slice(0, 50) || 'Image'], // Use first 50 chars as title
      ['a', project.tagId()], // NIP-33 reference to the project
    ]

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

    // Add voice mode tag if auto-TTS is enabled
    if (autoTTS) {
      newThreadEvent.tags.push(['mode', 'voice'])
    }

    await newThreadEvent.sign()
    setLocalRootEvent(newThreadEvent)
    await newThreadEvent.publish()
    
    // Notify parent component about the new thread
    if (onThreadCreated) {
      onThreadCreated(newThreadEvent.id)
    }

    return newThreadEvent
  }, [ndk, user, project, onThreadCreated])

  const sendReply = useCallback(async (
    content: string,
    mentions: AgentMention[],
    images: ImageUpload[],
    autoTTS: boolean,
    recentMessages: Message[]
  ) => {
    if (!ndk || !user || !localRootEvent) return null

    // Send a reply to the existing thread
    const replyEvent = localRootEvent.reply()
    replyEvent.content = content

    // Remove all p-tags that NDK's .reply() generated
    replyEvent.tags = replyEvent.tags.filter((tag) => tag[0] !== "p")

    // Add project tag
    replyEvent.tags.push(['a', project.tagId()])
    
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

    // If no agents were mentioned, p-tag the most recent non-user message author
    if (mentions.length === 0 && recentMessages.length > 0) {
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
  }, [ndk, user, localRootEvent, project])

  const sendMessage = useCallback(async (
    content: string,
    mentions: AgentMention[],
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