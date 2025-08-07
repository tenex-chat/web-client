import { describe, it, expect, vi } from 'vitest';
import { threadToMarkdown, copyThreadToClipboard } from './copyConversation';
import type { NDKEvent } from '@nostr-dev-kit/ndk';
import { EVENT_KINDS } from '../types';

describe('threadToMarkdown', () => {
    const mockProfiles = new Map([
        ['user1', { name: 'Alice' }],
        ['agent1', { name: 'Assistant Agent' }]
    ]);

    it('should handle empty messages', () => {
        expect(threadToMarkdown([], mockProfiles)).toBe('');
    });

    it('should include thread title when provided', () => {
        const messages: NDKEvent[] = [{
            kind: EVENT_KINDS.CHAT,
            pubkey: 'user1',
            content: 'Hello',
            created_at: 1234567890,
            tags: []
        } as NDKEvent];
        
        const result = threadToMarkdown(messages, mockProfiles, 'Test Thread');
        expect(result).toContain('# Test Thread');
    });

    it('should format chat messages correctly', () => {
        const messages: NDKEvent[] = [{
            kind: EVENT_KINDS.CHAT,
            pubkey: 'user1',
            content: 'Hello world',
            created_at: 1234567890,
            tags: []
        } as NDKEvent];
        
        const result = threadToMarkdown(messages, mockProfiles);
        expect(result).toContain('User - 1234567890:\nHello world');
    });

    it('should format task messages correctly', () => {
        const messages: NDKEvent[] = [{
            kind: EVENT_KINDS.TASK,
            pubkey: 'user1',
            content: 'Task description',
            created_at: 1234567890,
            tags: [
                ['title', 'Build feature'],
                ['complexity', '7']
            ]
        } as NDKEvent];
        
        const result = threadToMarkdown(messages, mockProfiles);
        expect(result).toContain('[Task: Build feature] Complexity: 7/10');
        expect(result).toContain('Task description');
    });

    it('should format agent request messages correctly', () => {
        const messages: NDKEvent[] = [{
            kind: EVENT_KINDS.AGENT_REQUEST,
            pubkey: 'agent1',
            content: 'Processing request',
            created_at: 1234567890,
            tags: [
                ['agent-name', 'Assistant Agent'],
                ['confidence-level', '8'],
                ['title', 'Analysis Complete']
            ]
        } as NDKEvent];
        
        const result = threadToMarkdown(messages, mockProfiles);
        expect(result).toContain('Assistant Agent - 1234567890:');
        expect(result).toContain('[Analysis Complete]');
        expect(result).toContain('Processing request (Confidence: 8/10)');
    });

    it('should handle messages without content', () => {
        const messages: NDKEvent[] = [{
            kind: 999, // Unknown kind
            pubkey: 'user1',
            content: '',
            created_at: 1234567890,
            tags: []
        } as NDKEvent];
        
        const result = threadToMarkdown(messages, mockProfiles);
        expect(result).toContain('(No content)');
    });

    it('should include metadata', () => {
        const messages: NDKEvent[] = [
            {
                kind: EVENT_KINDS.CHAT,
                pubkey: 'user1',
                content: 'Message 1',
                created_at: 1234567890,
                tags: []
            } as NDKEvent,
            {
                kind: EVENT_KINDS.CHAT,
                pubkey: 'user2',
                content: 'Message 2',
                created_at: 1234567891,
                tags: []
            } as NDKEvent
        ];
        
        const result = threadToMarkdown(messages, mockProfiles);
        expect(result).toContain('Thread created: 1234567890');
        expect(result).toContain('Messages: 2');
    });
});

describe('copyThreadToClipboard', () => {
    it('should copy markdown to clipboard successfully', async () => {
        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText
            }
        });

        const messages: NDKEvent[] = [{
            kind: EVENT_KINDS.CHAT,
            pubkey: 'user1',
            content: 'Test message',
            created_at: 1234567890,
            tags: []
        } as NDKEvent];

        const result = await copyThreadToClipboard(messages, new Map(), 'Test');
        
        expect(result).toBe(true);
        expect(mockWriteText).toHaveBeenCalledTimes(1);
        expect(mockWriteText.mock.calls[0][0]).toContain('Test message');
    });

    it('should return false on clipboard error', async () => {
        const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'));
        Object.assign(navigator, {
            clipboard: {
                writeText: mockWriteText
            }
        });

        const messages: NDKEvent[] = [{
            kind: EVENT_KINDS.CHAT,
            pubkey: 'user1',
            content: 'Test',
            created_at: 1234567890,
            tags: []
        } as NDKEvent];

        const result = await copyThreadToClipboard(messages, new Map());
        
        expect(result).toBe(false);
    });
});