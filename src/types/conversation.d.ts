// Conversation metadata types for kind 513 events
export interface ConversationMetadata {
  id: string; // The conversation ID (from 'e' tag)
  title?: {
    value: string;
    timestamp: number; // created_at of the kind 513 event
  };
  summary?: {
    value: string;
    timestamp: number; // created_at of the kind 513 event
  };
}

export interface ConversationMetadataState {
  metadata: Map<string, ConversationMetadata>;
  setMetadata: (
    conversationId: string,
    data: {
      title?: { value: string; timestamp: number };
      summary?: { value: string; timestamp: number };
    }
  ) => void;
  getMetadata: (conversationId: string) => ConversationMetadata | undefined;
}