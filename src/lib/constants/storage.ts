/**
 * Storage key constants used throughout the application
 */

export const STORAGE_KEYS = {
  // Murf TTS
  MURF_VOICES_CACHE: 'murf_voices_cache',
  MURF_API_KEY: 'murf_api_key',
  
  // Voice configuration
  VOICE_CONFIG_PREFIX: 'agent-voice-',
  
  // Appearance settings  
  APPEARANCE_SETTINGS: 'appearance-settings',
  COLOR_SCHEME: 'color-scheme',
  
  // Draft messages
  DRAFT_TIMESTAMPS: 'draft-timestamps',
  DRAFT_PREFIX: 'draft-',
  
  // Project settings
  PROJECT_SORT_ORDER: 'project-sort-order',
  PROJECT_VIEW_MODE: 'project-view-mode',
  
  // User preferences
  USER_LANGUAGE: 'user-language',
  USER_TIMEZONE: 'user-timezone',
} as const

/**
 * Cache duration constants in milliseconds
 */
export const CACHE_DURATIONS = {
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
} as const

/**
 * Default storage namespaces
 */
export const STORAGE_NAMESPACES = {
  APP: 'tenex',
  USER: 'user',
  PROJECT: 'project',
  AGENT: 'agent',
} as const