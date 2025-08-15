import { describe, it, expect, beforeEach } from 'vitest'
import { NDKForceRelease } from './NDKForceRelease'

describe('NDKForceRelease', () => {
  let forceRelease: NDKForceRelease

  beforeEach(() => {
    forceRelease = new NDKForceRelease()
  })

  it('should set the correct event kind', () => {
    expect(forceRelease.kind).toBe(NDKForceRelease.kind)
  })

  it('should create a force release with project reference', () => {
    const projectRef = '30023:pubkey123:project-dtag'
    const event = NDKForceRelease.create(projectRef)
    
    expect(event.projectReference).toBe(projectRef)
    expect(event.kind).toBe(NDKForceRelease.kind)
    expect(event.created_at).toBeDefined()
  })

  it('should create a force release with project reference and reason', () => {
    const projectRef = '30023:pubkey123:project-dtag'
    const reason = 'Agent is unresponsive'
    const event = NDKForceRelease.create(projectRef, reason)
    
    expect(event.projectReference).toBe(projectRef)
    expect(event.reason).toBe(reason)
    expect(event.kind).toBe(NDKForceRelease.kind)
  })

  it('should handle projectReference getter and setter', () => {
    const projectRef = '30023:pubkey123:project-dtag'
    forceRelease.projectReference = projectRef
    expect(forceRelease.projectReference).toBe(projectRef)
    
    forceRelease.projectReference = undefined
    expect(forceRelease.projectReference).toBeUndefined()
  })

  it('should handle reason getter and setter', () => {
    const reason = 'Manual intervention required'
    forceRelease.reason = reason
    expect(forceRelease.reason).toBe(reason)
    
    forceRelease.reason = undefined
    expect(forceRelease.reason).toBeUndefined()
  })

  it('should convert from NDKEvent', () => {
    const mockEvent = {
      ndk: undefined,
      rawEvent: () => ({
        id: 'test-id',
        pubkey: 'test-pubkey',
        created_at: Math.floor(Date.now() / 1000),
        kind: NDKForceRelease.kind,
        tags: [['a', '30023:pubkey123:project-dtag']],
        content: '',
        sig: 'test-sig'
      })
    }
    
    const converted = NDKForceRelease.from(mockEvent as any)
    expect(converted).toBeInstanceOf(NDKForceRelease)
    expect(converted.kind).toBe(NDKForceRelease.kind)
    expect(converted.projectReference).toBe('30023:pubkey123:project-dtag')
  })
})