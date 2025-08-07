import { describe, it, expect } from 'vitest';
import { StringUtils } from './business';

describe('StringUtils', () => {
    describe('truncate', () => {
        it('should return original text if shorter than maxLength', () => {
            expect(StringUtils.truncate('hello', 10)).toBe('hello');
        });

        it('should truncate and add ellipsis for long text', () => {
            expect(StringUtils.truncate('hello world', 8)).toBe('hello...');
        });

        it('should handle custom suffix', () => {
            expect(StringUtils.truncate('hello world', 8, '…')).toBe('hello w…');
        });

        it('should return original text when it equals maxLength', () => {
            expect(StringUtils.truncate('hi', 2, '...')).toBe('hi');
        });

        it('should handle empty string', () => {
            expect(StringUtils.truncate('', 10)).toBe('');
        });
    });

    describe('getInitials', () => {
        it('should extract initials from full name', () => {
            expect(StringUtils.getInitials('John Doe')).toBe('JD');
        });

        it('should handle single name', () => {
            expect(StringUtils.getInitials('John')).toBe('J');
        });

        it('should handle pubkey-style names', () => {
            expect(StringUtils.getInitials('npub1234...')).toBe('NP');
        });

        it('should limit to two characters', () => {
            expect(StringUtils.getInitials('John Middle Doe')).toBe('JM');
        });

        it('should handle empty string', () => {
            expect(StringUtils.getInitials('')).toBe('');
        });

        it('should uppercase initials', () => {
            expect(StringUtils.getInitials('john doe')).toBe('JD');
        });
    });

    describe('getFirstLine', () => {
        it('should extract first line from multiline text', () => {
            expect(StringUtils.getFirstLine('Line 1\nLine 2\nLine 3')).toBe('Line 1');
        });

        it('should handle single line text', () => {
            expect(StringUtils.getFirstLine('Single line')).toBe('Single line');
        });

        it('should truncate if maxLength provided', () => {
            expect(StringUtils.getFirstLine('Very long first line here', 10)).toBe('Very lo...');
        });

        it('should handle empty string', () => {
            expect(StringUtils.getFirstLine('')).toBe('');
        });

        it('should handle text starting with newline', () => {
            expect(StringUtils.getFirstLine('\nSecond line')).toBe('');
        });
    });

    describe('capitalize', () => {
        it('should capitalize first letter', () => {
            expect(StringUtils.capitalize('hello')).toBe('Hello');
        });

        it('should handle already capitalized', () => {
            expect(StringUtils.capitalize('Hello')).toBe('Hello');
        });

        it('should handle single character', () => {
            expect(StringUtils.capitalize('h')).toBe('H');
        });

        it('should handle empty string', () => {
            expect(StringUtils.capitalize('')).toBe('');
        });

        it('should not affect other characters', () => {
            expect(StringUtils.capitalize('hELLO')).toBe('HELLO');
        });
    });

    describe('slugify', () => {
        it('should convert to lowercase slug', () => {
            expect(StringUtils.slugify('Hello World')).toBe('hello-world');
        });

        it('should remove special characters', () => {
            expect(StringUtils.slugify('Hello, World!')).toBe('hello-world');
        });

        it('should handle multiple spaces', () => {
            expect(StringUtils.slugify('Hello   World')).toBe('hello-world');
        });

        it('should trim dashes from edges', () => {
            expect(StringUtils.slugify('--Hello World--')).toBe('hello-world');
        });

        it('should handle numbers', () => {
            expect(StringUtils.slugify('Test 123')).toBe('test-123');
        });

        it('should handle empty string', () => {
            expect(StringUtils.slugify('')).toBe('');
        });
    });
});