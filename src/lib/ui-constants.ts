export const UI_CONSTANTS = {
    TIMEOUTS: {
        COPY_FEEDBACK: 2000,
        FOCUS_DELAY: 100,
    },
    AUDIO: {
        SAMPLE_RATE: 44100,
    },
    WEBSOCKET_ERROR_CODES: {
        ABNORMAL_CLOSURE: 1006,
        POLICY_VIOLATION: 1008,
    },
    APIS: {
        DICEBEAR_BASE: 'https://api.dicebear.com/7.x',
        MURF_VOICES: 'https://api.murf.ai/v1/speech/voices',
    }
} as const;