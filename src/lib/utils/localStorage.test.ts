import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createStorageItem, getStorageString, setStorageString } from './localStorage';

describe('localStorage utilities', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    describe('createStorageItem', () => {
        it('should get null when item does not exist', () => {
            const item = createStorageItem<string>('test-key');
            expect(item.get()).toBeNull();
        });

        it('should return default value when item does not exist', () => {
            const item = createStorageItem<string>('test-key', 'default');
            expect(item.get()).toBe('default');
        });

        it('should store and retrieve values', () => {
            const item = createStorageItem<{ name: string; age: number }>('test-key');
            const testData = { name: 'John', age: 30 };
            
            item.set(testData);
            expect(item.get()).toEqual(testData);
        });

        it('should handle complex nested objects', () => {
            interface ComplexData {
                nested: {
                    array: number[];
                    object: { key: string };
                };
            }
            const item = createStorageItem<ComplexData>('test-key');
            const complexData: ComplexData = {
                nested: {
                    array: [1, 2, 3],
                    object: { key: 'value' }
                }
            };
            
            item.set(complexData);
            expect(item.get()).toEqual(complexData);
        });

        it('should remove items', () => {
            const item = createStorageItem<string>('test-key');
            item.set('test-value');
            expect(item.get()).toBe('test-value');
            
            item.remove();
            expect(item.get()).toBeNull();
        });

        it('should handle invalid JSON gracefully', () => {
            localStorage.setItem('test-key', 'invalid-json');
            const item = createStorageItem<string>('test-key', 'fallback');
            expect(item.get()).toBe('fallback');
        });

        it('should handle localStorage errors gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            const item = createStorageItem<string>('test-key');
            
            // Mock localStorage.setItem to throw an error
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });
            
            item.set('test-value');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to save to localStorage[test-key]:',
                expect.any(Error)
            );
            
            vi.restoreAllMocks();
        });
    });

    describe('getStorageString', () => {
        it('should get null when item does not exist', () => {
            expect(getStorageString('non-existent')).toBeNull();
        });

        it('should retrieve string values', () => {
            localStorage.setItem('test-key', 'test-value');
            expect(getStorageString('test-key')).toBe('test-value');
        });

        it('should handle errors gracefully', () => {
            const originalGetItem = localStorage.getItem;
            localStorage.getItem = vi.fn(() => {
                throw new Error('Storage error');
            });
            
            expect(getStorageString('test-key')).toBeNull();
            
            localStorage.getItem = originalGetItem;
        });
    });

    describe('setStorageString', () => {
        it('should store string values', () => {
            setStorageString('test-key', 'test-value');
            expect(localStorage.getItem('test-key')).toBe('test-value');
        });

        it('should handle errors gracefully', () => {
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });
            
            setStorageString('test-key', 'test-value');
            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to save string to localStorage[test-key]:',
                expect.any(Error)
            );
            
            vi.restoreAllMocks();
        });
    });
});