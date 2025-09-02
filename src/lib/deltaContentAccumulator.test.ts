import { describe, it, expect } from 'vitest'
import { DeltaContentAccumulator } from './deltaContentAccumulator'
import { NDKEvent } from '@nostr-dev-kit/ndk'

describe('DeltaContentAccumulator', () => {
  it('should accumulate deltas in sequence order', () => {
    const accumulator = new DeltaContentAccumulator()
    
    // Create mock events with sequence tags
    const event1 = new NDKEvent()
    event1.content = 'Hello '
    event1.tags = [['sequence', '1']]
    
    const event2 = new NDKEvent()
    event2.content = 'world'
    event2.tags = [['sequence', '2']]
    
    const event3 = new NDKEvent()
    event3.content = '!'
    event3.tags = [['sequence', '3']]
    
    // Add events
    accumulator.addEvent(event1)
    accumulator.addEvent(event2)
    const result = accumulator.addEvent(event3)
    
    expect(result).toBe('Hello world!')
    expect(accumulator.getContent()).toBe('Hello world!')
    expect(accumulator.getDeltaCount()).toBe(3)
  })
  
  it('should handle out-of-order deltas', () => {
    const accumulator = new DeltaContentAccumulator()
    
    const event1 = new NDKEvent()
    event1.content = 'Hello '
    event1.tags = [['sequence', '1']]
    
    const event2 = new NDKEvent()
    event2.content = 'world'
    event2.tags = [['sequence', '2']]
    
    const event3 = new NDKEvent()
    event3.content = '!'
    event3.tags = [['sequence', '3']]
    
    // Add events out of order
    accumulator.addEvent(event3)  // Add 3 first
    accumulator.addEvent(event1)  // Then 1
    const result = accumulator.addEvent(event2)  // Finally 2
    
    // Should still reconstruct in correct order
    expect(result).toBe('Hello world!')
  })
  
  it('should detect sequence gaps', () => {
    const accumulator = new DeltaContentAccumulator()
    
    const event1 = new NDKEvent()
    event1.content = 'Hello '
    event1.tags = [['sequence', '1']]
    
    const event3 = new NDKEvent()
    event3.content = '!'
    event3.tags = [['sequence', '3']]
    
    accumulator.addEvent(event1)
    accumulator.addEvent(event3)
    
    expect(accumulator.hasSequenceGaps()).toBe(true)
    expect(accumulator.getMissingSequences()).toEqual([2])
  })
  
  it('should handle events without sequence tags', () => {
    const accumulator = new DeltaContentAccumulator()
    
    const event = new NDKEvent()
    event.content = 'No sequence'
    event.tags = []  // No sequence tag
    
    const result = accumulator.addEvent(event)
    
    expect(result).toBe('No sequence')
    expect(accumulator.getDeltaCount()).toBe(1)
  })
  
  it('should clear accumulated content', () => {
    const accumulator = new DeltaContentAccumulator()
    
    const event1 = new NDKEvent()
    event1.content = 'Hello'
    event1.tags = [['sequence', '1']]
    
    accumulator.addEvent(event1)
    expect(accumulator.getContent()).toBe('Hello')
    
    accumulator.clear()
    expect(accumulator.getContent()).toBe('')
    expect(accumulator.getDeltaCount()).toBe(0)
  })
})