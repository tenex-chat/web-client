/**
 * Storage key constants used throughout the application
 */

export const STORAGE_KEYS = {
  // AI provider configuration
  AI_PROVIDERS: "ai-providers",
  ACTIVE_PROVIDER: "active-provider",
  VOICE_SETTINGS: "voice-settings",
  AGENT_VOICE_CONFIGS: "agent-voice-configs",

  // Speech-to-text settings
  STT_SETTINGS: "stt-settings",
  OPENROUTER_STT_MODEL: "openrouter-stt-model",

  // Appearance settings
  APPEARANCE_SETTINGS: "appearance-settings",
  COLOR_SCHEME: "color-scheme",

  // Draft messages
  DRAFT_TIMESTAMPS: "draft-timestamps",
  DRAFT_PREFIX: "draft-",

  // Project settings
  PROJECT_SORT_ORDER: "project-sort-order",
  PROJECT_VIEW_MODE: "project-view-mode",

  // User preferences
  USER_LANGUAGE: "user-language",
  USER_TIMEZONE: "user-timezone",
} as const;

/**
 * Cache duration constants in milliseconds
 */
export const CACHE_DURATIONS = {
  ONE_HOUR: 60 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
  ONE_MONTH: 30 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Default storage namespaces
 */
export const STORAGE_NAMESPACES = {
  APP: "tenex",
  USER: "user",
  PROJECT: "project",
  AGENT: "agent",
} as const;
