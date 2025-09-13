import { useState, useCallback } from "react";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface UseAsyncActionOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Hook for managing async actions with loading states, error handling, and toast notifications.
 * Eliminates boilerplate code for async operations throughout the application.
 *
 * @template T - The types of arguments the action accepts
 * @template R - The return type of the action
 *
 * @param action - The async function to execute
 * @param options - Configuration options for success/error handling
 *
 * @returns An object containing:
 *   - execute: Function to trigger the async action
 *   - isLoading: Boolean indicating if the action is in progress
 *   - error: Error object if the action failed, null otherwise
 *
 * @example
 * const { execute, isLoading } = useAsyncAction(
 *   async (id: string) => api.deleteItem(id),
 *   {
 *     successMessage: 'Item deleted',
 *     errorMessage: 'Failed to delete item'
 *   }
 * );
 *
 * // Usage in component
 * <Button onClick={() => execute(itemId)} disabled={isLoading}>
 *   {isLoading ? 'Deleting...' : 'Delete'}
 * </Button>
 */
export function useAsyncAction<T extends unknown[], R>(
  action: (...args: T) => Promise<R>,
  options: UseAsyncActionOptions = {},
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(
    async (...args: T): Promise<R | undefined> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await action(...args);

        if (options.successMessage) {
          toast.success(options.successMessage);
        }

        options.onSuccess?.();
        return result;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("An error occurred");
        setError(error);

        const message = options.errorMessage || `Failed: ${error.message}`;
        toast.error(message);
        logger.error(message, error);

        options.onError?.(error);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [action, options],
  );

  return {
    execute,
    isLoading,
    error,
  };
}
