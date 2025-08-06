/**
 * Simple logger for web-client
 */
export const logger = {
    info: (...args: unknown[]) => console.info("[INFO]", ...args),
    warn: (...args: unknown[]) => console.warn("[WARN]", ...args),
    error: (...args: unknown[]) => console.error("[ERROR]", ...args),
    debug: (...args: unknown[]) => console.debug("[DEBUG]", ...args),
};
