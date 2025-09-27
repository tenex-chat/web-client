/**
 * Centralized audio configuration constants
 * Replaces magic numbers scattered throughout the codebase
 */

export const AUDIO_CONFIG = {
  // VAD (Voice Activity Detection) settings
  VAD: {
    POSITIVE_SPEECH_THRESHOLD: 0.6, // 0-1, threshold for detecting speech start (higher = less sensitive)
    NEGATIVE_SPEECH_THRESHOLD: 0.35, // 0-1, threshold for detecting speech end (higher = needs more silence)
    REDEMPTION_FRAMES: 60, // ~2 seconds of silence before ending speech (increased from 40)
    PRE_SPEECH_PAD_FRAMES: 20, // Frames to include before detected speech (increased from 15)
    MIN_SPEECH_FRAMES: 15, // Minimum frames for valid speech detection (increased from 8)
    FRAME_MS: 32, // Approximate milliseconds per frame
  },

  // Speech interruption settings
  INTERRUPTION: {
    STOP_THRESHOLD_MS: 2000, // Stop TTS after 2 seconds of continuous user speech
    RESUME_DELAY_MS: 500, // Resume TTS after 500ms of user silence
  },

  // Audio recording settings
  RECORDING: {
    CHUNK_INTERVAL_MS: 100, // Collect audio data every 100ms
    FFT_SIZE: 256, // FFT size for audio analysis
    SMOOTHING_TIME_CONSTANT: 0.8, // Audio level smoothing
    RMS_SCALE_FACTOR: 10, // Scale factor for RMS audio level (higher = more sensitive)
  },

  // Streaming TTS settings
  STREAMING: {
    INITIAL_PLAYBACK_DELAY_MS: 100, // Delay before starting playback
    CHUNK_COMBINE_THRESHOLD: 8192, // Combine chunks smaller than 8KB
    PENDING_CHUNKS_TIMEOUT_MS: 5000, // Timeout for processing pending chunks
    PENDING_CHUNKS_CHECK_INTERVAL_MS: 100, // Check interval for pending chunks
    PROGRESS_UPDATE_INTERVAL_MS: 100, // Update playback progress every 100ms
  },

  // Playback settings
  PLAYBACK: {
    MIN_RATE: 0.25, // Minimum playback rate
    MAX_RATE: 4.0, // Maximum playback rate
    DEFAULT_RATE: 1.0, // Default playback rate
    MIN_VOLUME: 0, // Minimum volume
    MAX_VOLUME: 1.0, // Maximum volume
    DEFAULT_VOLUME: 1.0, // Default volume
    SKIP_FORWARD_SECONDS: 10, // Default skip forward duration
    SKIP_BACKWARD_SECONDS: 10, // Default skip backward duration
  },

  // Resource management
  RESOURCES: {
    AUDIO_CONTEXT_CLOSE_DELAY_MS: 1000, // Delay before closing unused AudioContext
    MAX_RETRY_ATTEMPTS: 3, // Maximum retry attempts for failed operations
  },

  // Media formats
  FORMATS: {
    PREFERRED_AUDIO_MIME: 'audio/webm',
    FALLBACK_AUDIO_MIME: 'audio/mp4',
    STREAMING_AUDIO_MIME: 'audio/mpeg', // MP3 for streaming
  },
} as const;

export type AudioConfig = typeof AUDIO_CONFIG;