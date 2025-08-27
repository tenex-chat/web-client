import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { NDKProject } from '@/lib/ndk-events/NDKProject'
import { useProjectsStore } from './projects'

// Storage key for localStorage
const OPEN_PROJECTS_STORAGE_KEY = 'tenex:openProjects'

// Store project identifiers (dTag or bech32) in localStorage
const openProjectIdsAtom = atomWithStorage<string[]>(OPEN_PROJECTS_STORAGE_KEY, [])

// Derived atom that converts stored IDs back to NDKProject instances
export const openProjectsAtom = atom<NDKProject[], [NDKProject[] | ((prev: NDKProject[]) => NDKProject[])], void>(
  (get) => {
    const projectIds = get(openProjectIdsAtom)
    const projectsStore = useProjectsStore.getState()
    
    // Ensure projectIds is an array (handle corrupted localStorage)
    const safeProjectIds = Array.isArray(projectIds) ? projectIds : []
    
    // Map stored IDs to actual project instances
    const projects: NDKProject[] = []
    for (const id of safeProjectIds) {
      const project = projectsStore.getProjectByIdentifier(id)
      if (project) {
        projects.push(project)
      }
    }
    return projects
  },
  (get, set, newProjects: NDKProject[] | ((prev: NDKProject[]) => NDKProject[])) => {
    // Handle both direct array and updater function
    if (typeof newProjects === 'function') {
      // For updater functions, we need to get current projects first
      const projectIds = get(openProjectIdsAtom)
      const projectsStore = useProjectsStore.getState()
      const safeProjectIds = Array.isArray(projectIds) ? projectIds : []
      
      const currentProjects: NDKProject[] = []
      for (const id of safeProjectIds) {
        const project = projectsStore.getProjectByIdentifier(id)
        if (project) {
          currentProjects.push(project)
        }
      }
      
      const resolvedProjects = newProjects(currentProjects)
      const projectsArray = Array.isArray(resolvedProjects) ? resolvedProjects : []
      const newProjectIds = projectsArray.map(p => p.dTag || p.encode())
      set(openProjectIdsAtom, newProjectIds)
    } else {
      // Direct array assignment
      const projectsArray = Array.isArray(newProjects) ? newProjects : []
      const projectIds = projectsArray.map(p => p.dTag || p.encode())
      set(openProjectIdsAtom, projectIds)
    }
  }
)

// Helper atom to check if a project is open
export const isProjectOpenAtom = atom(
  (get) => (projectId: string) => {
    const openProjects = get(openProjectsAtom)
    return openProjects.some(p => (p.dTag || p.encode()) === projectId)
  }
)

// Helper atom to toggle a project open/closed
export const toggleProjectAtom = atom(
  null,
  (get, set, project: NDKProject) => {
    const projectIds = get(openProjectIdsAtom)
    // Ensure projectIds is an array
    const safeProjectIds = Array.isArray(projectIds) ? projectIds : []
    const projectId = project.dTag || project.encode()
    const isOpen = safeProjectIds.includes(projectId)
    
    if (isOpen) {
      // Remove the project ID
      set(openProjectIdsAtom, safeProjectIds.filter(id => id !== projectId))
    } else {
      // Add the project ID
      set(openProjectIdsAtom, [...safeProjectIds, projectId])
    }
  }
)

// Helper to close all projects
export const closeAllProjectsAtom = atom(
  null,
  (_get, set) => {
    set(openProjectIdsAtom, [])
  }
)

// Helper to open a single project (closes others)
export const openSingleProjectAtom = atom(
  null,
  (_get, set, project: NDKProject) => {
    const projectId = project.dTag || project.encode()
    set(openProjectIdsAtom, [projectId])
  }
)