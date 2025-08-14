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

// Appearance settings
export const fontSizeAtom = atomWithStorage<'small' | 'medium' | 'large'>(
  'font-size',
  'medium'
)

export const compactModeAtom = atomWithStorage<boolean>(
  'compact-mode',
  false
)

export const animationsEnabledAtom = atomWithStorage<boolean>(
  'animations-enabled',
  true
)

// Notification settings
export const notificationSettingsAtom = atomWithStorage<{
  projectUpdates: boolean
  taskAssignments: boolean
  agentResponses: boolean
  threadReplies: boolean
  mentions: boolean
  soundEnabled: boolean
}>(
  'notification-settings',
  {
    projectUpdates: true,
    taskAssignments: true,
    agentResponses: true,
    threadReplies: true,
    mentions: true,
    soundEnabled: true
  }
)