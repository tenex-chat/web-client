import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { NDKEvent } from '@nostr-dev-kit/ndk-hooks';

interface ReplyContextType {
  replyingTo: NDKEvent | null;
  setReplyingTo: (event: NDKEvent | null) => void;
  clearReply: () => void;
}

const ReplyContext = createContext<ReplyContextType | undefined>(undefined);

export function ReplyProvider({ children }: { children: ReactNode }) {
  const [replyingTo, setReplyingTo] = useState<NDKEvent | null>(null);

  const clearReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  return (
    <ReplyContext.Provider value={{ replyingTo, setReplyingTo, clearReply }}>
      {children}
    </ReplyContext.Provider>
  );
}

export function useReply() {
  const context = useContext(ReplyContext);
  if (!context) {
    throw new Error('useReply must be used within a ReplyProvider');
  }
  return context;
}