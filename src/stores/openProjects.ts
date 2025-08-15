import { atom } from 'jotai'
import { NDKProject } from '@/lib/ndk-events/NDKProject'

// Store which projects are currently open in columns
export const openProjectsAtom = atom<NDKProject[]>([])

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
    const openProjects = get(openProjectsAtom)
    const projectId = project.dTag || project.encode()
    const isOpen = openProjects.some(p => (p.dTag || p.encode()) === projectId)
    
    if (isOpen) {
      // Remove the project
      set(openProjectsAtom, openProjects.filter(p => (p.dTag || p.encode()) !== projectId))
    } else {
      // Add the project
      set(openProjectsAtom, [...openProjects, project])
    }
  }
)

// Helper to close all projects
export const closeAllProjectsAtom = atom(
  null,
  (_get, set) => {
    set(openProjectsAtom, [])
  }
)

// Helper to open a single project (closes others)
export const openSingleProjectAtom = atom(
  null,
  (_get, set, project: NDKProject) => {
    set(openProjectsAtom, [project])
  }
)