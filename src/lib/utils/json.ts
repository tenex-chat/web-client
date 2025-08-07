import { logger } from "../logger";

/**
 * Safely parse JSON string with error handling
 * @param jsonString The JSON string to parse
 * @param defaultValue The default value to return if parsing fails
 * @returns The parsed value or the default value
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        logger.error("Failed to parse JSON:", error);
        return defaultValue;
    }
}

/**
 * Safely parse JSON string with null fallback
 * @param jsonString The JSON string to parse
 * @returns The parsed value or null
 */
export function tryJsonParse<T>(jsonString: string): T | null {
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        logger.error("Failed to parse JSON in tryJsonParse:", error);
        return null;
    }
}