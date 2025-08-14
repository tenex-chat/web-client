import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { handleAsync, createDebouncedAsync } from './async-handlers'
import { toast } from 'sonner'

// Mock the toast library
vi.mock('sonner', () => ({
  toast: {
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    error: vi.fn()
  }
}))

describe('handleAsync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles successful async operations', async () => {
    const mockFn = vi.fn().mockResolvedValue('success')
    const onSuccess = vi.fn()

    const result = await handleAsync(mockFn, {
      successMessage: 'Great success!',
      onSuccess
    })

    expect(result).toBe('success')
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Great success!')
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('handles failed async operations', async () => {
    const error = new Error('Something went wrong')
    const mockFn = vi.fn().mockRejectedValue(error)
    const onError = vi.fn()

    const result = await handleAsync(mockFn, {
      errorMessage: 'Oh no!',
      onError
    })

    expect(result).toBeUndefined()
    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(toast.error).toHaveBeenCalledWith('Oh no!')
    expect(onError).toHaveBeenCalledWith(error)
  })

  it('shows loading toast when loadingMessage is provided', async () => {
    const mockFn = vi.fn().mockResolvedValue('success')

    await handleAsync(mockFn, {
      loadingMessage: 'Loading...',
      successMessage: 'Done!'
    })

    expect(toast.loading).toHaveBeenCalledWith('Loading...')
    expect(toast.success).toHaveBeenCalledWith('Done!', { id: 'toast-id' })
  })

  it('handles non-Error exceptions', async () => {
    const mockFn = vi.fn().mockRejectedValue('string error')
    const onError = vi.fn()

    await handleAsync(mockFn, {
      errorMessage: 'Failed',
      onError
    })

    expect(toast.error).toHaveBeenCalledWith('Failed')
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })
})

describe('createDebouncedAsync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces async function calls', async () => {
    const mockFn = vi.fn().mockResolvedValue('result')
    const debounced = createDebouncedAsync(mockFn, 100)

    debounced('arg1')
    debounced('arg2')
    debounced('arg3')

    expect(mockFn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(100)

    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('arg3')
  })

  it('cancels previous calls when new ones arrive', () => {
    const mockFn = vi.fn().mockResolvedValue('result')
    const debounced = createDebouncedAsync(mockFn, 200)

    debounced('first')
    vi.advanceTimersByTime(100)
    debounced('second')
    vi.advanceTimersByTime(100)
    debounced('third')
    vi.advanceTimersByTime(200)

    expect(mockFn).toHaveBeenCalledTimes(1)
    expect(mockFn).toHaveBeenCalledWith('third')
  })
})