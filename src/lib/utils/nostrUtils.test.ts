import { describe, it, expect } from 'vitest'
import { NDKEvent } from '@nostr-dev-kit/ndk-hooks'
import { 
  findTagValue, 
  findAllTagValues, 
  parseVersion, 
  compareVersions 
} from './nostrUtils'

describe('nostrUtils', () => {
  describe('findTagValue', () => {
    it('should find tag value by name', () => {
      const event = {
        tags: [
          ['title', 'Test Title'],
          ['status', 'active'],
          ['name', 'Test Name']
        ]
      } as NDKEvent

      expect(findTagValue(event, 'title')).toBe('Test Title')
      expect(findTagValue(event, 'status')).toBe('active')
      expect(findTagValue(event, 'nonexistent')).toBeUndefined()
    })

    it('should handle events without tags', () => {
      const event = {} as NDKEvent
      expect(findTagValue(event, 'title')).toBeUndefined()
    })
  })

  describe('findAllTagValues', () => {
    it('should find all tag values with same name', () => {
      const event = {
        tags: [
          ['category', 'tech'],
          ['category', 'news'],
          ['title', 'Test'],
          ['category', 'updates']
        ]
      } as NDKEvent

      const categories = findAllTagValues(event, 'category')
      expect(categories).toEqual(['tech', 'news', 'updates'])
    })

    it('should return empty array for nonexistent tags', () => {
      const event = { tags: [] } as unknown as NDKEvent
      expect(findAllTagValues(event, 'category')).toEqual([])
    })
  })

  describe('parseVersion', () => {
    it('should parse version strings', () => {
      expect(parseVersion('10')).toBe(10)
      expect(parseVersion('0')).toBe(0)
      expect(parseVersion('123')).toBe(123)
    })

    it('should handle undefined and null', () => {
      expect(parseVersion(undefined)).toBe(0)
      expect(parseVersion(null)).toBe(0)
      expect(parseVersion('')).toBe(0)
    })
  })

  describe('compareVersions', () => {
    it('should compare versions in descending order', () => {
      const items = [
        { version: '1' },
        { version: '10' },
        { version: '5' },
        { version: undefined },
        { version: '3' }
      ]

      const sorted = [...items].sort(compareVersions)
      
      expect(sorted[0].version).toBe('10')
      expect(sorted[1].version).toBe('5')
      expect(sorted[2].version).toBe('3')
      expect(sorted[3].version).toBe('1')
      expect(sorted[4].version).toBeUndefined()
    })
  })
})