import { useEffect, useRef } from 'react'
import { useAtomValue } from 'jotai'
import { useProjectsArray } from '@/stores/projects'
import { openProjectsAtom } from '@/stores/openProjects'

/**
 * Hook that restores open projects from localStorage when projects are loaded
 * This ensures that the column layout persists across page reloads
 */
export function useRestoreOpenProjects() {
  const projects = useProjectsArray()
  const openProjects = useAtomValue(openProjectsAtom)
  const hasRestoredRef = useRef(false)
  
  useEffect(() => {
    // Only trigger restoration once when projects are loaded
    if (projects.length > 0 && !hasRestoredRef.current) {
      hasRestoredRef.current = true
      // The openProjectsAtom will automatically restore from localStorage
      // when it's first accessed, so we just need to trigger a read
    }
  }, [projects.length])
  
  // Return the current open projects for convenience
  return openProjects
}