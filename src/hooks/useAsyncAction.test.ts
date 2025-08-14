import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { toast } from 'sonner'
import { useAsyncAction } from './useAsyncAction'

// Mock the toast library
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock the logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn()
  }
}))

describe('useAsyncAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should execute async action successfully', async () => {
    const mockAction = vi.fn().mockResolvedValue('success')
    const onSuccess = vi.fn()
    
    const { result } = renderHook(() => 
      useAsyncAction(mockAction, {
        successMessage: 'Action completed',
        onSuccess
      })
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)

    let executeResult: unknown
    await act(async () => {
      executeResult = await result.current.execute()
    })

    expect(executeResult).toBe('success')
    expect(mockAction).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(toast.success).toHaveBeenCalledWith('Action completed')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('should handle async action failure', async () => {
    const mockError = new Error('Test error')
    const mockAction = vi.fn().mockRejectedValue(mockError)
    const onError = vi.fn()
    
    const { result } = renderHook(() => 
      useAsyncAction(mockAction, {
        errorMessage: 'Action failed',
        onError
      })
    )

    let executeResult: unknown
    await act(async () => {
      executeResult = await result.current.execute()
    })

    expect(executeResult).toBeUndefined()
    expect(mockAction).toHaveBeenCalledTimes(1)
    expect(onError).toHaveBeenCalledWith(mockError)
    expect(toast.error).toHaveBeenCalledWith('Action failed')
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toEqual(mockError)
  })

  it('should manage loading state correctly', async () => {
    const mockAction = vi.fn().mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve('done'), 100))
    )
    
    const { result } = renderHook(() => useAsyncAction(mockAction))

    expect(result.current.isLoading).toBe(false)

    const executePromise = act(async () => {
      return result.current.execute()
    })

    // Check loading state immediately after starting
    expect(result.current.isLoading).toBe(true)

    await executePromise

    expect(result.current.isLoading).toBe(false)
  })

  it('should pass arguments to the action', async () => {
    const mockAction = vi.fn().mockResolvedValue('result')
    
    const { result } = renderHook(() => 
      useAsyncAction(mockAction)
    )

    await act(async () => {
      await result.current.execute('arg1', 'arg2', 123)
    })

    expect(mockAction).toHaveBeenCalledWith('arg1', 'arg2', 123)
  })

  it('should reset error state on new execution', async () => {
    const mockError = new Error('Test error')
    const mockAction = vi.fn()
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce('success')
    
    const { result } = renderHook(() => useAsyncAction(mockAction))

    // First execution - failure
    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.error).toEqual(mockError)

    // Second execution - success
    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.error).toBe(null)
  })

  it('should handle non-Error exceptions', async () => {
    const mockAction = vi.fn().mockRejectedValue('string error')
    
    const { result } = renderHook(() => useAsyncAction(mockAction))

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.error).toBeInstanceOf(Error)
    expect(result.current.error?.message).toBe('An error occurred')
    expect(toast.error).toHaveBeenCalledWith('Failed: An error occurred')
  })

  it('should use default error message when not provided', async () => {
    const mockError = new Error('Specific error')
    const mockAction = vi.fn().mockRejectedValue(mockError)
    
    const { result } = renderHook(() => useAsyncAction(mockAction))

    await act(async () => {
      await result.current.execute()
    })

    expect(toast.error).toHaveBeenCalledWith('Failed: Specific error')
  })
})