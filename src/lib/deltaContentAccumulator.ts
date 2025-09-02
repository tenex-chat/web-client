import { NDKEvent } from '@nostr-dev-kit/ndk'

export class DeltaContentAccumulator {
  private deltas = new Map<number, string>()
  private lastReconstructedSequence = 0
  private cachedContent = ''
  
  addEvent(event: NDKEvent): string {
    const sequenceTag = event.tags.find(t => t[0] === 'sequence')
    const sequence = sequenceTag ? parseInt(sequenceTag[1]) : 0
    
    // If no content, don't add
    if (!event.content) {
      return this.cachedContent
    }
    
    this.deltas.set(sequence, event.content)
    
    // Always reconstruct to handle out-of-order events
    this.cachedContent = this.reconstruct()
    this.lastReconstructedSequence = this.getHighestSequence()
    
    return this.cachedContent
  }
  
  private reconstruct(): string {
    return Array.from(this.deltas.entries())
      .sort(([a], [b]) => a - b)
      .map(([_, content]) => content)
      .join('')
  }
  
  private getHighestSequence(): number {
    return Math.max(...Array.from(this.deltas.keys()), 0)
  }
  
  hasSequenceGaps(): boolean {
    const sequences = Array.from(this.deltas.keys()).sort((a, b) => a - b)
    if (sequences.length === 0) return false
    
    for (let i = 1; i < sequences.length; i++) {
      if (sequences[i] - sequences[i - 1] > 1) {
        return true
      }
    }
    return false
  }
  
  getMissingSequences(): number[] {
    const sequences = Array.from(this.deltas.keys()).sort((a, b) => a - b)
    const missing: number[] = []
    
    if (sequences.length === 0) return missing
    
    for (let i = 1; i < sequences.length; i++) {
      const gap = sequences[i] - sequences[i - 1]
      if (gap > 1) {
        for (let j = sequences[i - 1] + 1; j < sequences[i]; j++) {
          missing.push(j)
        }
      }
    }
    
    return missing
  }
  
  clear(): void {
    this.deltas.clear()
    this.lastReconstructedSequence = 0
    this.cachedContent = ''
  }
  
  getContent(): string {
    return this.cachedContent
  }
  
  getDeltaCount(): number {
    return this.deltas.size
  }
}