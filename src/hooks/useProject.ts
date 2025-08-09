import { useEffect, useState } from 'react'
import { useNDK } from '@nostr-dev-kit/ndk-hooks'
import { NDKProject } from '@/lib/ndk-events/NDKProject'

/**
 * Custom hook to fetch and manage an NDKProject by its ID
 * @param projectId - The ID of the project to fetch
 * @returns Object containing the project, loading state, and error
 */
export function useProject(projectId: string | undefined) {
  const { ndk } = useNDK()
  const [project, setProject] = useState<NDKProject | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!ndk || !projectId) {
      setIsLoading(false)
      return
    }

    const fetchProject = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const event = await ndk.fetchEvent(projectId)
        if (event && event.kind === 31933) {
          const proj = new NDKProject(ndk, event.rawEvent())
          setProject(proj)
        } else {
          setProject(null)
        }
      } catch (err) {
        console.error('Failed to fetch project:', err)
        setError(err instanceof Error ? err : new Error('Failed to fetch project'))
        setProject(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProject()
  }, [ndk, projectId])

  return { project, isLoading, error }
}