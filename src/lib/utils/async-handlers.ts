import { toast } from 'sonner'

interface AsyncHandlerOptions {
  loadingMessage?: string
  successMessage?: string
  errorMessage?: string
  onSuccess?: () => void
  onError?: (error: Error) => void
}

/**
 * Wrapper for async operations with automatic toast notifications
 * @param fn The async function to execute
 * @param options Configuration for toast messages and callbacks
 * @returns The result of the async function or undefined if it fails
 */
export async function handleAsync<T>(
  fn: () => Promise<T>,
  options: AsyncHandlerOptions = {}
): Promise<T | undefined> {
  const {
    loadingMessage,
    successMessage = 'Operation completed successfully',
    errorMessage = 'Operation failed',
    onSuccess,
    onError
  } = options

  const toastId = loadingMessage ? toast.loading(loadingMessage) : undefined

  try {
    const result = await fn()
    
    if (toastId) {
      toast.success(successMessage, { id: toastId })
    } else if (successMessage) {
      toast.success(successMessage)
    }
    
    onSuccess?.()
    return result
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error))
    
    if (toastId) {
      toast.error(errorMessage, { id: toastId })
    } else {
      toast.error(errorMessage)
    }
    
    console.error(errorMessage, err)
    onError?.(err)
    return undefined
  }
}

/**
 * Creates a debounced async handler
 * @param fn The async function to execute
 * @param delay Debounce delay in milliseconds
 * @returns A debounced version of the function
 */
export function createDebouncedAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | undefined

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}