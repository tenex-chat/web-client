import { atomWithStorage } from 'jotai/utils'

// Sidebar state
export const sidebarCollapsedAtom = atomWithStorage<boolean>(
  'sidebar-collapsed',
  false
)

// Theme state  
export const themeAtom = atomWithStorage<'light' | 'dark'>(
  'theme', 
  'dark'
)