/**
 * Type-safe localStorage utilities
 */

export interface StorageItem<T> {
    get(): T | null;
    set(value: T): void;
    remove(): void;
}

/**
 * Create a type-safe localStorage accessor for a specific key
 */
export function createStorageItem<T>(
    key: string,
    defaultValue?: T
): StorageItem<T> {
    return {
        get(): T | null {
            try {
                const stored = localStorage.getItem(key);
                if (!stored) return defaultValue ?? null;
                return JSON.parse(stored) as T;
            } catch {
                return defaultValue ?? null;
            }
        },
        
        set(value: T): void {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (error) {
                console.error(`Failed to save to localStorage[${key}]:`, error);
            }
        },
        
        remove(): void {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error(`Failed to remove from localStorage[${key}]:`, error);
            }
        }
    };
}

/**
 * Get a raw string value from localStorage
 */
export function getStorageString(key: string): string | null {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * Set a raw string value in localStorage
 */
export function setStorageString(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch (error) {
        console.error(`Failed to save string to localStorage[${key}]:`, error);
    }
}