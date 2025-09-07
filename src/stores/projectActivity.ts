import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface ProjectActivityState {
  // Map of projectId -> last activity timestamp (Unix timestamp in seconds)
  activityTimestamps: Map<string, number>
  
  // Update the activity timestamp for a project
  updateActivity: (projectId: string, timestamp?: number) => void
  
  // Get the activity timestamp for a project, initializing if needed
  getOrInitActivity: (projectId: string, fallbackTimestamp?: number) => number
  
  // Get the activity timestamp for a project
  getActivity: (projectId: string) => number | undefined
  
  // Clear all activity timestamps
  clearActivities: () => void
}

export const useProjectActivityStore = create<ProjectActivityState>()(
  persist(
    (set, get) => ({
      activityTimestamps: new Map(),
      
      updateActivity: (projectId: string, timestamp?: number) => {
        const now = timestamp || Math.floor(Date.now() / 1000)
        set((state) => {
          const newTimestamps = new Map(state.activityTimestamps)
          // Only update if the new timestamp is newer or if no timestamp exists
          const existing = newTimestamps.get(projectId)
          if (!existing || now > existing) {
            newTimestamps.set(projectId, now)
          }
          return { activityTimestamps: newTimestamps }
        })
      },
      
      getOrInitActivity: (projectId: string, fallbackTimestamp?: number) => {
        const existing = get().activityTimestamps.get(projectId)
        if (existing) {
          return existing
        }
        
        // Initialize with fallback timestamp or project creation time
        const initialTimestamp = fallbackTimestamp || Math.floor(Date.now() / 1000)
        set((state) => {
          const newTimestamps = new Map(state.activityTimestamps)
          newTimestamps.set(projectId, initialTimestamp)
          return { activityTimestamps: newTimestamps }
        })
        return initialTimestamp
      },
      
      getActivity: (projectId: string) => {
        return get().activityTimestamps.get(projectId)
      },
      
      clearActivities: () => {
        set({ activityTimestamps: new Map() })
      }
    }),
    {
      name: 'project-activity-storage',
      storage: createJSONStorage(() => localStorage),
      // Custom serialization for Map
      partialize: (state) => ({
        activityTimestamps: Array.from(state.activityTimestamps.entries())
      }),
      // Custom deserialization for Map
      onRehydrateStorage: () => (state) => {
        interface SerializedState {
          activityTimestamps?: [string, number][];
        }
        if (state && Array.isArray((state as SerializedState).activityTimestamps)) {
          state.activityTimestamps = new Map((state as SerializedState).activityTimestamps)
        }
      }
    }
  )
)