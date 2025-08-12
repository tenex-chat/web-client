import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseAsyncActionOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useAsyncAction<T extends any[], R>(
  action: (...args: T) => Promise<R>,
  options: UseAsyncActionOptions = {}
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
        const error = err instanceof Error ? err : new Error('An error occurred');
        setError(error);
        
        const message = options.errorMessage || `Failed: ${error.message}`;
        toast.error(message);
        console.error(message, error);
        
        options.onError?.(error);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [action, options]
  );

  return {
    execute,
    isLoading,
    error,
  };
}