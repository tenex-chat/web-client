export const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://relay.primal.net',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social'
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
} as const

// Upload limits
export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_MB: 100, // maximum file size in MB
  MAX_CONCURRENT_UPLOADS: 3, // maximum concurrent uploads
  MAX_RETRY_COUNT: 3, // maximum upload retry attempts
} as const

export const EVENT_KINDS = {
  METADATA: 0,
  SHORT_TEXT_NOTE: 1,
  ARTICLE: 30023,
  TASK: 1934,
  PROJECT: 17171,
  PROJECT_START: 17172,
  FORCE_RELEASE: 38783,
  PROJECT_STATUS: 39039,
  MCP_TOOL: 4200,
  AGENT_CONFIG: 4199,
  AGENT_DEFINITION: 32039,
  AGENT_INSTANCE: 32040,
  AGENT_CAPABILITIES_REQUEST: 32041,
  AGENT_CAPABILITIES_RESPONSE: 32042,
  AGENT_CONVERSATION_REQUEST: 32043,
  AGENT_CONVERSATION_RESPONSE: 32044,
  AGENT_TEXT_REQUEST: 7777,
  AGENT_TEXT_RESPONSE: 7778,
  AGENT_LESSON: 32045,
  AGENT_REQUEST: 32046,
  AGENT_REQUEST_LIST: 32047,
  CHAT: 9,
  THREAD_REPLY: 1111,
  STREAMING_RESPONSE: 7779,
  TYPING_INDICATOR: 7780,
  TYPING_INDICATOR_STOP: 7781,
  LLM_CONFIG_CHANGE: 7782
} as const