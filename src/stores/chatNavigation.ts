import { create } from 'zustand'
import { NDKEvent } from '@nostr-dev-kit/ndk'

interface NavigationStack {
  stack: NDKEvent[]
  currentRoot: NDKEvent | null
}

interface ChatNavigationStore {
  // Per-project navigation stacks
  projectStacks: Map<string, NavigationStack>
  
  // Push a new conversation to the stack for a project
  pushToStack: (projectId: string, event: NDKEvent) => void
  
  // Pop from stack and return the previous conversation
  popFromStack: (projectId: string) => NDKEvent | null
  
  // Check if we can go back for a project
  canGoBack: (projectId: string) => boolean
  
  // Clear the navigation stack for a project
  clearStack: (projectId: string) => void
  
  // Get the current stack for a project
  getStack: (projectId: string) => NDKEvent[]
  
  // Set the current root event for a project
  setCurrentRoot: (projectId: string, event: NDKEvent | null) => void
  
  // Get the current root event for a project
  getCurrentRoot: (projectId: string) => NDKEvent | null
}

export const useChatNavigationStore = create<ChatNavigationStore>((set, get) => ({
  projectStacks: new Map(),
  
  pushToStack: (projectId: string, event: NDKEvent) => {
    set((state) => {
      const newStacks = new Map(state.projectStacks)
      const projectStack = newStacks.get(projectId) || { stack: [], currentRoot: null }
      
      // Only push the current root if it exists and isn't already the same event
      if (projectStack.currentRoot && projectStack.currentRoot.id !== event.id) {
        projectStack.stack = [...projectStack.stack, projectStack.currentRoot]
      }
      
      projectStack.currentRoot = event
      newStacks.set(projectId, projectStack)
      
      return { projectStacks: newStacks }
    })
  },
  
  popFromStack: (projectId: string) => {
    const state = get()
    const projectStack = state.projectStacks.get(projectId)
    
    if (!projectStack || projectStack.stack.length === 0) {
      return null
    }
    
    const previousEvent = projectStack.stack[projectStack.stack.length - 1]
    
    set((state) => {
      const newStacks = new Map(state.projectStacks)
      const projectStack = newStacks.get(projectId)!
      
      projectStack.stack = projectStack.stack.slice(0, -1)
      projectStack.currentRoot = previousEvent
      newStacks.set(projectId, projectStack)
      
      return { projectStacks: newStacks }
    })
    
    return previousEvent
  },
  
  canGoBack: (projectId: string) => {
    const state = get()
    const projectStack = state.projectStacks.get(projectId)
    return projectStack ? projectStack.stack.length > 0 : false
  },
  
  clearStack: (projectId: string) => {
    set((state) => {
      const newStacks = new Map(state.projectStacks)
      newStacks.delete(projectId)
      return { projectStacks: newStacks }
    })
  },
  
  getStack: (projectId: string) => {
    const state = get()
    const projectStack = state.projectStacks.get(projectId)
    return projectStack ? projectStack.stack : []
  },
  
  setCurrentRoot: (projectId: string, event: NDKEvent | null) => {
    set((state) => {
      const newStacks = new Map(state.projectStacks)
      const projectStack = newStacks.get(projectId) || { stack: [], currentRoot: null }
      
      projectStack.currentRoot = event
      newStacks.set(projectId, projectStack)
      
      return { projectStacks: newStacks }
    })
  },
  
  getCurrentRoot: (projectId: string) => {
    const state = get()
    const projectStack = state.projectStacks.get(projectId)
    return projectStack ? projectStack.currentRoot : null
  }
}))