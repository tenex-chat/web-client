import { create } from "zustand";

/**
 * Represents metadata for a single conversation.
 * Tracks both the value and timestamp for cumulative updates.
 */
interface ConversationMetadata {
  id: string;
  title?: { value: string; timestamp: number };
  summary?: { value: string; timestamp: number };
}

/**
 * Result object for conversation metadata queries.
 * Provides default values to reduce null checks in consuming components.
 */
export interface ConversationMetadataResult {
  id: string;
  title: string | undefined;
  summary: string | undefined;
  hasTitle: boolean;
  hasSummary: boolean;
}

interface ConversationMetadataState {
  metadata: Map<string, ConversationMetadata>;
  
  /**
   * Updates metadata for a conversation.
   * This is a "dumb" setter - complex logic should be handled by the caller.
   * 
   * Why: Keeping the store simple and focused on state management makes it
   * easier to test and reason about. Business logic belongs in the listener.
   */
  setMetadata: (
    conversationId: string,
    data: {
      title?: { value: string; timestamp: number };
      summary?: { value: string; timestamp: number };
    }
  ) => void;
  
  /**
   * Gets raw metadata for a conversation.
   * Used internally by the listener for timestamp comparisons.
   */
  getMetadata: (conversationId: string) => ConversationMetadata | undefined;
  
  /**
   * Gets user-friendly metadata with defaults.
   * Reduces null checks in consuming components.
   */
  getConversationData: (conversationId: string | undefined) => ConversationMetadataResult;
  
  /**
   * Clears all metadata.
   * Useful for testing and cleanup.
   */
  clearMetadata: () => void;
}

/**
 * Global store for conversation metadata from kind 513 events.
 * 
 * Why Zustand: Provides a simple, performant global state solution that
 * integrates well with React hooks and is easier to test than context-based solutions.
 * 
 * Why Map: O(1) lookups for conversation metadata by ID, which is critical
 * for performance when dealing with potentially thousands of conversations.
 */
export const useConversationMetadataStore = create<ConversationMetadataState>(
  (set, get) => ({
    metadata: new Map<string, ConversationMetadata>(),
    
    setMetadata: (conversationId, newData) => {
      set((state) => {
        const current = state.metadata.get(conversationId) || {
          id: conversationId,
        };
        const updated = { ...current };

        // Simple assignment - cumulative logic is handled in the processor
        if (newData.title) {
          updated.title = newData.title;
        }

        if (newData.summary) {
          updated.summary = newData.summary;
        }

        const newMap = new Map(state.metadata);
        newMap.set(conversationId, updated);
        return { metadata: newMap };
      });
    },
    
    getMetadata: (conversationId) => get().metadata.get(conversationId),
    
    getConversationData: (conversationId) => {
      if (!conversationId) {
        return {
          id: "",
          title: undefined,
          summary: undefined,
          hasTitle: false,
          hasSummary: false
        };
      }
      
      const metadata = get().metadata.get(conversationId);
      
      return {
        id: conversationId,
        title: metadata?.title?.value,
        summary: metadata?.summary?.value,
        hasTitle: !!metadata?.title,
        hasSummary: !!metadata?.summary
      };
    },
    
    clearMetadata: () => {
      set({ metadata: new Map() });
    }
  })
);