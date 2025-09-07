import { describe, it, expect } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  it('should merge class names', () => {
    const result = cn('px-2', 'py-1')
    expect(result).toBe('px-2 py-1')
  })

  it('should handle Tailwind conflicts properly', () => {
    // Later classes should override earlier ones
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toBe('py-1 px-4')
  })

  it('should handle conditional classes', () => {
    const condition = true
    const result = cn('text-red-500', condition && 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('should ignore falsy values', () => {
    const condition = false
    const result = cn('text-red-500', condition && 'text-blue-500', null, undefined, '')
    expect(result).toBe('text-red-500')
  })

  it('should handle arrays of classes', () => {
    const result = cn(['px-2', 'py-1'], 'mt-2')
    expect(result).toBe('px-2 py-1 mt-2')
  })

  it('should handle object notation', () => {
    const result = cn({
      'text-red-500': true,
      'text-blue-500': false,
      'font-bold': true
    })
    expect(result).toBe('text-red-500 font-bold')
  })

  it('should merge conflicting margin classes correctly', () => {
    // tailwind-merge resolves conflicts, with later classes overriding earlier ones
    const result = cn('m-2', 'mx-4', 'mt-6')
    // m-2 sets all margins, mx-4 overrides horizontal, mt-6 overrides top
    expect(result).toBe('m-2 mx-4 mt-6')
  })

  it('should handle empty inputs', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('should handle complex color overrides', () => {
    const result = cn(
      'bg-red-500 hover:bg-red-600',
      'bg-blue-500 hover:bg-blue-700'
    )
    expect(result).toBe('bg-blue-500 hover:bg-blue-700')
  })

  it('should preserve non-conflicting classes', () => {
    const result = cn(
      'text-sm font-medium',
      'px-4 py-2',
      'bg-blue-500'
    )
    expect(result).toBe('text-sm font-medium px-4 py-2 bg-blue-500')
  })
})