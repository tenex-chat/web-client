import { useState, useCallback } from 'react';

/**
 * Hook for managing chat input state and handlers
 */
export function useChatInput() {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMessageChange = useCallback((value: string) => {
    setMessage(value);
  }, []);

  const clearMessage = useCallback(() => {
    setMessage('');
  }, []);

  const handleSubmit = useCallback(async (onSubmit: (message: string) => Promise<void>) => {
    if (!message.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(message);
      clearMessage();
    } finally {
      setIsSubmitting(false);
    }
  }, [message, isSubmitting, clearMessage]);

  return {
    message,
    setMessage: handleMessageChange,
    clearMessage,
    handleSubmit,
    isSubmitting
  };
}