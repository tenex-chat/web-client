import { useMemo } from 'react'
import { useProjectsStore } from '@/stores/projects'
import { useProjectActivityStore } from '@/stores/projectActivity'
import type { NDKProject } from '@/lib/ndk-events/NDKProject'
import type { ProjectStatusData } from '@/stores/projects'

interface SortedProject {
  project: NDKProject
  status: ProjectStatusData | null
  sortKey: number
}

export function useSortedProjects() {
  const projectsWithStatus = useProjectsStore(state => state.projectsWithStatusArray)
  const getOrInitActivity = useProjectActivityStore(state => state.getOrInitActivity)
  
  const sortedProjects = useMemo(() => {
    if (!projectsWithStatus || projectsWithStatus.length === 0) {
      return []
    }
    
    // Create an array with sort keys for stable sorting
    const projectsWithSortKeys: SortedProject[] = projectsWithStatus.map(({ project, status }) => {
      const projectId = project.tagId()
      
      // Get or initialize activity timestamp - this ensures every project has a stable timestamp
      // Use project creation time as fallback for projects that have never been active
      const sortKey = getOrInitActivity(projectId, project.created_at || 0)
      
      return {
        project,
        status,
        sortKey
      }
    })
    
    // Sort by:
    // 1. Online status (online first)
    // 2. Sort key (higher/more recent first)
    // 3. Title as fallback
    return projectsWithSortKeys.sort((a, b) => {
      // Online projects come first
      if (a.status?.isOnline !== b.status?.isOnline) {
        return a.status?.isOnline ? -1 : 1
      }
      
      // Sort by activity/creation time (more recent first)
      if (a.sortKey !== b.sortKey) {
        return b.sortKey - a.sortKey
      }
      
      // Fallback to title
      return a.project.title.localeCompare(b.project.title)
    })
  }, [projectsWithStatus, getOrInitActivity])
  
  return sortedProjects
}