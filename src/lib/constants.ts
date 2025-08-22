// DON'T CHANGE THIS!
export const DEFAULT_RELAYS = [
  'wss://tenex.chat',
]

export const TEST_CREDENTIALS = {
  NSEC: 'nsec1q9kaf583ud7f9jm4xtmj8052uvym9jasy502xnvwxqmsq8lxtmfsvgqa8v',
  NPUB: 'npub1mru8hcgw9nhlyaj0v3asx8jfz4t8tytfrcvh2wlk456s9t7yy6qse9wqzj'
} as const

export const UPLOAD_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const

export type UploadStatus = typeof UPLOAD_STATUS[keyof typeof UPLOAD_STATUS]

// Timing constants
export const TIMING = {
  TYPING_INDICATOR_TIMEOUT: 5000, // milliseconds for typing indicator timeout
  HEALTH_CHECK_INTERVAL: 60000, // milliseconds for health check interval  
  LATENCY_CHECK_TIMEOUT: 5000, // milliseconds for latency check timeout
  PROJECT_STATUS_FILTER_SECONDS: 600, // seconds for project status events filter
  DRAFT_CLEANUP_DURATION: 7 * 24 * 60 * 60 * 1000, // 7 days for draft cleanup
  NIP07_CHECK_DELAY: 1000, // milliseconds to wait before checking for NIP-07 extension
  COPY_FEEDBACK_DURATION: 2000, // milliseconds to show copy feedback
  RESIZE_DEBOUNCE_DELAY: 300, // milliseconds to debounce resize events
} as const

// Upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 100, // maximum file size in MB
  MAX_CONCURRENT_UPLOADS: 3, // maximum concurrent uploads
  MAX_RETRY_COUNT: 3, // maximum upload retry attempts
} as const

// Virtual list thresholds
export const VIRTUAL_LIST_THRESHOLDS = {
  THREAD_LIST: 10, // Use virtual list for more than 10 threads
  CHAT_MESSAGES: 50, // Use virtual list for more than 50 messages
  TASKS: 20, // Use virtual list for more than 20 tasks
} as const

// Subscription limits
export const SUBSCRIPTION_LIMITS = {
  DEFAULT_LIMIT: 50, // Default limit for event subscriptions
  PROJECT_STATUS_MINUTES: 10, // Minutes to look back for project status events
} as const

// IMPORTANT: Only add custom event kinds here that are NOT already defined in NDKKind
// or in our NDK wrapper classes (NDKTask, NDKProject, etc.)!
// DO NOT add standard Nostr kinds like 0, 1, 3, 4, 5, 6, 7, etc.
// Use NDKKind.Metadata, NDKKind.Text, NDKKind.Contacts, etc. for standard kinds
// Use NDKTask.kind, NDKProject.kind, etc. for our custom wrapper classes
export const EVENT_KINDS = {
	AGENT_REQUEST: 3199,
	AGENT_REQUEST_LIST: 13199,
	PROJECT_START: 24000,
	LLM_CONFIG_CHANGE: 24101,
	TYPING_INDICATOR: 24111,
	TYPING_INDICATOR_STOP: 24112,
	STREAMING_RESPONSE: 21111,
} as const;