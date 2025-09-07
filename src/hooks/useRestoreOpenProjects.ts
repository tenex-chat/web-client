import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { useProjectsArray } from '@/stores/projects'
import { openProjectsAtom } from '@/stores/openProjects'

/**
 * Hook that restores open projects from localStorage when projects are loaded
 * This ensures that the column layout persists across page reloads
 */
export function useRestoreOpenProjects() {
  const projects = useProjectsArray()
  const [openProjects, setOpenProjects] = useAtom(openProjectsAtom)
  const hasRestoredRef = useRef(false)
  
  useEffect(() => {
    // Only trigger restoration once when projects are loaded
    if (projects.length > 0 && !hasRestoredRef.current) {
      hasRestoredRef.current = true
      // Force a re-read of the open projects atom to ensure proper restoration
      // This triggers the atom to re-evaluate with the now-loaded projects
      setOpenProjects(prev => [...prev])
    }
  }, [projects.length, setOpenProjects])
  
  // Return the current open projects for convenience
  return openProjects
}