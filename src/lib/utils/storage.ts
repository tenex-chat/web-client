import { logger } from '@/lib/logger'

/**
 * Type-safe localStorage wrapper with error handling
 */
export class Storage {
  /**
   * Get item from localStorage with type safety and error handling
   */
  static getItem<T>(key: string, defaultValue?: T): T | undefined {
    try {
      const item = localStorage.getItem(key)
      if (!item) return defaultValue
      return JSON.parse(item) as T
    } catch (error) {
      logger.error(`Failed to get item from localStorage: ${key}`, error)
      return defaultValue
    }
  }

  /**
   * Set item in localStorage with error handling
   */
  static setItem<T>(key: string, value: T): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      logger.error(`Failed to set item in localStorage: ${key}`, error)
      return false
    }
  }

  /**
   * Remove item from localStorage
   */
  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      logger.error(`Failed to remove item from localStorage: ${key}`, error)
    }
  }

  /**
   * Clear all items from localStorage
   */
  static clear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      logger.error('Failed to clear localStorage', error)
    }
  }

  /**
   * Check if an item exists in localStorage
   */
  static hasItem(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null
    } catch {
      return false
    }
  }
}

/**
 * Create a namespaced storage instance
 */
export function createNamespacedStorage(namespace: string) {
  const prefixKey = (key: string) => `${namespace}:${key}`

  return {
    getItem<T>(key: string, defaultValue?: T): T | undefined {
      return Storage.getItem(prefixKey(key), defaultValue)
    },
    setItem<T>(key: string, value: T): boolean {
      return Storage.setItem(prefixKey(key), value)
    },
    removeItem(key: string): void {
      Storage.removeItem(prefixKey(key))
    },
    hasItem(key: string): boolean {
      return Storage.hasItem(prefixKey(key))
    }
  }
}