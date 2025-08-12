import { useProjectsStore } from '@/stores/projects'

/**
 * Custom hook to get an NDKProject by its ID from the store
 * @param projectId - The ID of the project to get from the store
 * @returns The project from the store or null if not found
 */
export function useProject(projectId: string | undefined) {
  const projects = useProjectsStore(state => state.projects)
  return projectId ? projects.get(projectId) || null : null
}