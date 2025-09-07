import { create } from 'zustand'
import { DrawerContent } from '@/components/windows/FloatingWindow'

export interface WindowState {
  id: string
  content: DrawerContent
  isMinimized: boolean
  zIndex: number
  position: { x: number; y: number }
}

interface WindowManagerStore {
  windows: Map<string, WindowState>
  nextZIndex: number
  addWindow: (content: DrawerContent) => string | null
  removeWindow: (id: string) => void
  minimizeWindow: (id: string) => void
  restoreWindow: (id: string) => void
  focusWindow: (id: string) => void
  canAddWindow: () => boolean
  getWindowById: (id: string) => WindowState | undefined
  isContentOpen: (content: DrawerContent) => boolean
  attachToDrawer: (id: string, onAttach: (content: DrawerContent) => void) => void
}

const MAX_WINDOWS = 5
const BASE_Z_INDEX = 60
const CASCADE_OFFSET = 30

function generateId(): string {
  return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function getNextPosition(windowCount: number): { x: number; y: number } {
  const offset = windowCount * CASCADE_OFFSET
  return {
    x: 100 + offset,
    y: 100 + offset
  }
}

function isSameContent(a: DrawerContent, b: DrawerContent): boolean {
  if (a.type !== b.type) return false
  if (a.project.dTag !== b.project.dTag) return false
  
  // For conversations
  if (a.type === 'conversations' && b.type === 'conversations') {
    if (a.item === 'new' && b.item === 'new') return true
    if (a.data && b.data && a.data.id === b.data.id) return true
  }
  
  // For docs
  if (a.type === 'docs' && b.type === 'docs') {
    if (a.item === 'new' && b.item === 'new') return true
    if (a.item instanceof Object && b.item instanceof Object) {
      interface ItemWithId {
        id?: string;
      }
      return (a.item as ItemWithId).id === (b.item as ItemWithId).id
    }
  }
  
  // For agents
  if (a.type === 'agents' && b.type === 'agents') {
    return a.item === b.item
  }
  
  // For settings
  if (a.type === 'settings' && b.type === 'settings') {
    return a.item === b.item
  }
  
  return false
}

export const useWindowManager = create<WindowManagerStore>((set, get) => ({
  windows: new Map(),
  nextZIndex: BASE_Z_INDEX,
  
  addWindow: (content: DrawerContent) => {
    const state = get()
    
    // Check if we've reached the limit
    if (state.windows.size >= MAX_WINDOWS) {
      return null
    }
    
    // Check if this content is already open
    for (const [_, window] of state.windows) {
      if (isSameContent(window.content, content)) {
        // Focus the existing window instead
        get().focusWindow(window.id)
        if (window.isMinimized) {
          get().restoreWindow(window.id)
        }
        return window.id
      }
    }
    
    // Create new window
    const id = generateId()
    const position = getNextPosition(state.windows.size)
    
    const newWindow: WindowState = {
      id,
      content,
      isMinimized: false,
      zIndex: state.nextZIndex,
      position
    }
    
    set((state) => {
      const newWindows = new Map(state.windows)
      newWindows.set(id, newWindow)
      return {
        windows: newWindows,
        nextZIndex: state.nextZIndex + 1
      }
    })
    
    return id
  },
  
  removeWindow: (id: string) => {
    set((state) => {
      const newWindows = new Map(state.windows)
      newWindows.delete(id)
      return { windows: newWindows }
    })
  },
  
  minimizeWindow: (id: string) => {
    set((state) => {
      const newWindows = new Map(state.windows)
      const window = newWindows.get(id)
      if (window) {
        newWindows.set(id, { ...window, isMinimized: true })
      }
      return { windows: newWindows }
    })
  },
  
  restoreWindow: (id: string) => {
    set((state) => {
      const newWindows = new Map(state.windows)
      const window = newWindows.get(id)
      if (window) {
        newWindows.set(id, { 
          ...window, 
          isMinimized: false,
          zIndex: state.nextZIndex // Bring to front when restored
        })
      }
      return { 
        windows: newWindows,
        nextZIndex: state.nextZIndex + 1
      }
    })
  },
  
  focusWindow: (id: string) => {
    set((state) => {
      const newWindows = new Map(state.windows)
      const window = newWindows.get(id)
      if (window && window.zIndex < state.nextZIndex - 1) {
        newWindows.set(id, { 
          ...window, 
          zIndex: state.nextZIndex 
        })
        return { 
          windows: newWindows,
          nextZIndex: state.nextZIndex + 1
        }
      }
      return state
    })
  },
  
  canAddWindow: () => {
    return get().windows.size < MAX_WINDOWS
  },
  
  getWindowById: (id: string) => {
    return get().windows.get(id)
  },
  
  isContentOpen: (content: DrawerContent) => {
    const state = get()
    for (const [_, window] of state.windows) {
      if (isSameContent(window.content, content)) {
        return true
      }
    }
    return false
  },
  
  attachToDrawer: (id: string, onAttach: (content: DrawerContent) => void) => {
    const state = get()
    const window = state.windows.get(id)
    if (window) {
      onAttach(window.content)
      get().removeWindow(id)
    }
  }
}))