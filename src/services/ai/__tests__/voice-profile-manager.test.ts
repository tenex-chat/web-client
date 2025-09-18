import { describe, it, expect } from 'vitest';
import { getDeterministicVoiceIndex } from '../voice-profile-manager';

describe('getDeterministicVoiceIndex', () => {
  it('should return 0 for empty identifier', () => {
    expect(getDeterministicVoiceIndex('', 5)).toBe(0);
  });

  it('should return 0 for zero voice count', () => {
    expect(getDeterministicVoiceIndex('agent-123', 0)).toBe(0);
  });

  it('should return consistent index for same identifier', () => {
    const identifier = 'agent-123';
    const voiceCount = 5;
    
    const index1 = getDeterministicVoiceIndex(identifier, voiceCount);
    const index2 = getDeterministicVoiceIndex(identifier, voiceCount);
    
    expect(index1).toBe(index2);
  });

  it('should return index within bounds', () => {
    const identifiers = [
      'agent-123',
      'agent-456',
      'agent-789',
      'project-abc',
      'thread-xyz',
    ];
    const voiceCount = 3;
    
    identifiers.forEach(id => {
      const index = getDeterministicVoiceIndex(id, voiceCount);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(voiceCount);
    });
  });

  it('should distribute different identifiers across available indices', () => {
    const voiceCount = 5;
    const indices = new Set<number>();
    
    // Generate indices for many different identifiers
    for (let i = 0; i < 100; i++) {
      const index = getDeterministicVoiceIndex(`agent-${i}`, voiceCount);
      indices.add(index);
    }
    
    // We should have used multiple different indices (not all the same)
    expect(indices.size).toBeGreaterThan(1);
  });

  it('should handle special characters in identifier', () => {
    const specialIds = [
      'agent/123#456',
      'project@domain.com',
      'thread_with-special.chars!',
      '🎤voice-agent🎵',
    ];
    
    const voiceCount = 4;
    
    specialIds.forEach(id => {
      const index = getDeterministicVoiceIndex(id, voiceCount);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(voiceCount);
    });
  });
});