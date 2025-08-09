import { useEffect, useState } from 'react'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'

export interface ProjectAgentTag {
  pubkey: string
  slug: string
}

export function useProjectAgents(projectTagId?: string): ProjectAgentTag[] {
  const { ndk } = useNDK()
  const [agents, setAgents] = useState<ProjectAgentTag[]>([])

  useEffect(() => {
    if (!ndk || !projectTagId) return

    const fetchProjectAgents = async () => {
      try {
        // Fetch the project event to get agent tags
        const projectEvent = await ndk.fetchEvent(projectTagId)
        if (!projectEvent) return

        // Extract agent info from tags
        const agentTags = projectEvent.tags.filter(tag => tag[0] === 'agent')
        const projectAgents: ProjectAgentTag[] = agentTags.map(tag => ({
          pubkey: tag[1],
          slug: tag[2] || tag[1].slice(0, 8)
        }))

        setAgents(projectAgents)
      } catch (error) {
        console.error('Failed to fetch project agents:', error)
      }
    }

    fetchProjectAgents()
  }, [ndk, projectTagId])

  return agents
}