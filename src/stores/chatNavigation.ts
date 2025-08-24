import { create } from 'zustand'
import { NDKEvent } from '@nostr-dev-kit/ndk'

interface ChatNavigationStore {
  // Simple conversation stack
  stack: NDKEvent[]
  currentRoot: NDKEvent | null
  
  // Push a new conversation to the stack
  pushToStack: (event: NDKEvent) => void
  
  // Pop from stack and return the previous conversation
  popFromStack: () => NDKEvent | null
  
  // Check if we can go back
  canGoBack: () => boolean
  
  // Clear the navigation stack
  clearStack: () => void
  
  // Get the current stack
  getStack: () => NDKEvent[]
  
  // Set the current root event
  setCurrentRoot: (event: NDKEvent | null) => void
  
  // Get the current root event
  getCurrentRoot: () => NDKEvent | null
  
  // Legacy per-project methods (for backwards compatibility)
  projectStacks: Map<string, { stack: NDKEvent[], currentRoot: NDKEvent | null }>
}

export const useChatNavigationStore = create<ChatNavigationStore>((set, get) => ({
  stack: [],
  currentRoot: null,
  projectStacks: new Map(), // Keep for backwards compatibility
  
  pushToStack: (event: NDKEvent) => {
    set((state) => {
      // Only push the current root if it exists and isn't already the same event
      const newStack = state.currentRoot && state.currentRoot.id !== event.id
        ? [...state.stack, state.currentRoot]
        : state.stack
      
      return { 
        stack: newStack,
        currentRoot: event 
      }
    })
  },
  
  popFromStack: () => {
    const state = get()
    
    if (state.stack.length === 0) {
      return null
    }
    
    const previousEvent = state.stack[state.stack.length - 1]
    
    set((state) => ({
      stack: state.stack.slice(0, -1),
      currentRoot: previousEvent
    }))
    
    return previousEvent
  },
  
  canGoBack: () => {
    const state = get()
    return state.stack.length > 0
  },
  
  clearStack: () => {
    set({
      stack: [],
      currentRoot: null
    })
  },
  
  getStack: () => {
    const state = get()
    return state.stack
  },
  
  setCurrentRoot: (event: NDKEvent | null) => {
    set({ currentRoot: event })
  },
  
  getCurrentRoot: () => {
    const state = get()
    return state.currentRoot
  }
}))