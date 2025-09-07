import { useEffect, useState } from 'react'
import { useSubscribe, useNDK } from '@nostr-dev-kit/ndk-hooks'
import { NDKProjectStatus } from '@/lib/ndk-events/NDKProjectStatus'
import { TIMING } from '@/lib/constants'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import { logger } from '@/lib/logger'

interface ProjectWithStatus {
  project: NDKProject
  isOnline: boolean
  lastSeen?: Date
}

export function useProjectsWithStatus(projects: NDKProject[]) {
  const { ndk } = useNDK()
  const [projectsWithStatus, setProjectsWithStatus] = useState<ProjectWithStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userPubkey, setUserPubkey] = useState<string | undefined>()

  // Get all project tag IDs
  const projectTagIds = projects.map(p => p.tagId())

  // Get current user's pubkey for filtering status events
  useEffect(() => {
    ndk?.signer?.user?.()?.then(u => setUserPubkey(u?.pubkey))
  }, [ndk])

  // Subscribe to status events published by the current user (their projects)
  // This is much more efficient than fetching all status events
  const { events } = useSubscribe(
    projects.length > 0 && userPubkey ? [{
      kinds: [NDKProjectStatus.kind as number],
      '#p': [userPubkey], // Only fetch status events that reference the current user
      since: Math.floor(Date.now() / 1000) - TIMING.PROJECT_STATUS_FILTER_SECONDS
    }] : []
  )

  useEffect(() => {
    if (projects.length === 0) {
      setProjectsWithStatus([])
      setIsLoading(false)
      return
    }

    // Create a set of our project IDs for quick lookup
    const projectIdSet = new Set(projectTagIds)
    
    // Create a map of project ID to latest status event
    const statusMap = new Map<string, NDKProjectStatus>()
    
    if (events && events.length > 0) {
      logger.debug(`[Sidebar] Found ${events.length} total status events, filtering for ${projects.length} projects`)
      
      events.forEach(event => {
        const status = NDKProjectStatus.from(event)
        const projectId = status.projectId
        
        // Only process status events for OUR projects
        if (projectId && projectIdSet.has(projectId)) {
          const existing = statusMap.get(projectId)
          if (!existing || (event.created_at || 0) > (existing.created_at || 0)) {
            statusMap.set(projectId, status)
            const projectName = projects.find(p => p.tagId() === projectId)?.title
            logger.debug(`Status for project ${projectName || projectId}:`, {
              isOnline: status.isOnline,
              agents: status.agents.length,
              models: status.models.length,
              lastSeen: status.lastSeen
            })
          }
        }
      })
      
      logger.debug(`[Sidebar] Filtered to ${statusMap.size} relevant status events`)
    }

    // Map projects with their status
    const projectsWithStatusList = projects.map(project => {
      const tagId = project.tagId()
      const status = statusMap.get(tagId)
      
      if (project.title === 'Ambulando') {
        logger.debug(`Ambulando tagId: ${tagId}`)
        logger.debug(`Has status:`, !!status)
        logger.debug(`Is online:`, status?.isOnline)
      }
      
      return {
        project,
        isOnline: status?.isOnline || false,
        lastSeen: status?.lastSeen
      }
    })

    // Sort projects: online first, then by last seen, then by title
    const sorted = projectsWithStatusList.sort((a, b) => {
      // Online projects come first
      if (a.isOnline && !b.isOnline) return -1
      if (!a.isOnline && b.isOnline) return 1
      
      // If both have same online status, sort by last seen
      if (a.lastSeen && b.lastSeen) {
        return b.lastSeen.getTime() - a.lastSeen.getTime()
      }
      if (a.lastSeen && !b.lastSeen) return -1
      if (!a.lastSeen && b.lastSeen) return 1
      
      // Finally, sort by title
      return a.project.title.localeCompare(b.project.title)
    })

    setProjectsWithStatus(sorted)
    setIsLoading(false)
  }, [events, projects, ndk, projectTagIds])

  return {
    projectsWithStatus,
    isLoading
  }
}