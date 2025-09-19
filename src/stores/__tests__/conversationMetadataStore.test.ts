import { describe, it, expect, beforeEach } from "vitest";
import { useConversationMetadataStore } from "../conversationMetadataStore";

describe("conversationMetadataStore", () => {
  beforeEach(() => {
    // Reset store before each test
    useConversationMetadataStore.getState().clearMetadata();
  });

  describe("Basic functionality", () => {
    it("should store and retrieve metadata", () => {
      const store = useConversationMetadataStore.getState();
      const conversationId = "test-conversation-id";

      // Set title
      store.setMetadata(conversationId, {
        title: { value: "Test Title", timestamp: 1000 }
      });

      // Get metadata
      const metadata = store.getMetadata(conversationId);
      expect(metadata?.title?.value).toBe("Test Title");
      expect(metadata?.title?.timestamp).toBe(1000);
    });

    it("should update title and summary independently", () => {
      const store = useConversationMetadataStore.getState();
      const conversationId = "test-conversation-id";

      // Set initial title and summary
      store.setMetadata(conversationId, {
        title: { value: "Title 1", timestamp: 1000 },
        summary: { value: "Summary 1", timestamp: 1000 }
      });

      let metadata = store.getMetadata(conversationId);
      expect(metadata?.title?.value).toBe("Title 1");
      expect(metadata?.summary?.value).toBe("Summary 1");

      // Update only title
      store.setMetadata(conversationId, {
        title: { value: "Title 2", timestamp: 2000 }
      });
      
      metadata = store.getMetadata(conversationId);
      expect(metadata?.title?.value).toBe("Title 2");
      expect(metadata?.summary?.value).toBe("Summary 1"); // Summary should remain unchanged

      // Update only summary  
      store.setMetadata(conversationId, {
        summary: { value: "Summary 2", timestamp: 3000 }
      });
      
      metadata = store.getMetadata(conversationId);
      expect(metadata?.title?.value).toBe("Title 2"); // Title should remain unchanged
      expect(metadata?.summary?.value).toBe("Summary 2");
    });

    it("should handle multiple conversations independently", () => {
      const store = useConversationMetadataStore.getState();
      const conversation1 = "conversation-1";
      const conversation2 = "conversation-2";

      // Set metadata for conversation 1
      store.setMetadata(conversation1, {
        title: { value: "Conv 1 Title", timestamp: 1000 }
      });

      // Set metadata for conversation 2
      store.setMetadata(conversation2, {
        title: { value: "Conv 2 Title", timestamp: 1000 }
      });
      
      expect(store.getMetadata(conversation1)?.title?.value).toBe("Conv 1 Title");
      expect(store.getMetadata(conversation2)?.title?.value).toBe("Conv 2 Title");
    });
  });

  describe("getConversationData interface", () => {
    it("should return user-friendly data with helper flags", () => {
      const store = useConversationMetadataStore.getState();
      const conversationId = "test-id";

      // Set metadata
      store.setMetadata(conversationId, {
        title: { value: "Test Title", timestamp: 1000 },
        summary: { value: "Test Summary", timestamp: 1000 }
      });

      const data = store.getConversationData(conversationId);
      expect(data.id).toBe(conversationId);
      expect(data.title).toBe("Test Title");
      expect(data.summary).toBe("Test Summary");
      expect(data.hasTitle).toBe(true);
      expect(data.hasSummary).toBe(true);
    });

    it("should return defaults for non-existent conversations", () => {
      const store = useConversationMetadataStore.getState();
      
      const data = store.getConversationData("non-existent");
      expect(data.id).toBe("non-existent");
      expect(data.title).toBeUndefined();
      expect(data.summary).toBeUndefined();
      expect(data.hasTitle).toBe(false);
      expect(data.hasSummary).toBe(false);
    });

    it("should handle undefined conversation ID gracefully", () => {
      const store = useConversationMetadataStore.getState();
      
      const data = store.getConversationData(undefined);
      expect(data.id).toBe("");
      expect(data.title).toBeUndefined();
      expect(data.summary).toBeUndefined();
      expect(data.hasTitle).toBe(false);
      expect(data.hasSummary).toBe(false);
    });

    it("should correctly report partial metadata", () => {
      const store = useConversationMetadataStore.getState();
      const conversationId = "partial-test";

      // Set only title
      store.setMetadata(conversationId, {
        title: { value: "Only Title", timestamp: 1000 }
      });

      const data = store.getConversationData(conversationId);
      expect(data.title).toBe("Only Title");
      expect(data.summary).toBeUndefined();
      expect(data.hasTitle).toBe(true);
      expect(data.hasSummary).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("should handle empty string conversation IDs", () => {
      const store = useConversationMetadataStore.getState();
      
      // Should still work with empty string ID
      store.setMetadata("", {
        title: { value: "Empty ID Title", timestamp: 1000 }
      });
      
      const metadata = store.getMetadata("");
      expect(metadata?.title?.value).toBe("Empty ID Title");
    });

    it("should handle very long titles and summaries", () => {
      const store = useConversationMetadataStore.getState();
      const conversationId = "long-content";
      const longTitle = "a".repeat(10000);
      const longSummary = "b".repeat(10000);

      store.setMetadata(conversationId, {
        title: { value: longTitle, timestamp: 1000 },
        summary: { value: longSummary, timestamp: 1000 }
      });

      const metadata = store.getMetadata(conversationId);
      expect(metadata?.title?.value).toBe(longTitle);
      expect(metadata?.summary?.value).toBe(longSummary);
    });

    it("should handle concurrent updates to same conversation", () => {
      const store = useConversationMetadataStore.getState();
      const conversationId = "concurrent-test";

      // Simulate concurrent updates
      store.setMetadata(conversationId, {
        title: { value: "Title A", timestamp: 1000 }
      });
      
      store.setMetadata(conversationId, {
        summary: { value: "Summary B", timestamp: 1001 }
      });

      const metadata = store.getMetadata(conversationId);
      expect(metadata?.title?.value).toBe("Title A");
      expect(metadata?.summary?.value).toBe("Summary B");
    });

    it("should handle setting same value multiple times", () => {
      const store = useConversationMetadataStore.getState();
      const conversationId = "duplicate-test";

      // Set same title multiple times
      for (let i = 0; i < 5; i++) {
        store.setMetadata(conversationId, {
          title: { value: "Same Title", timestamp: 1000 + i }
        });
      }

      const metadata = store.getMetadata(conversationId);
      expect(metadata?.title?.value).toBe("Same Title");
      expect(metadata?.title?.timestamp).toBe(1004); // Last timestamp
    });

    it("should preserve metadata when updating with undefined fields", () => {
      const store = useConversationMetadataStore.getState();
      const conversationId = "preserve-test";

      // Set initial metadata
      store.setMetadata(conversationId, {
        title: { value: "Initial Title", timestamp: 1000 },
        summary: { value: "Initial Summary", timestamp: 1000 }
      });

      // Update with empty object (should preserve existing)
      store.setMetadata(conversationId, {});

      const metadata = store.getMetadata(conversationId);
      expect(metadata?.title?.value).toBe("Initial Title");
      expect(metadata?.summary?.value).toBe("Initial Summary");
    });
  });

  describe("clearMetadata", () => {
    it("should clear all stored metadata", () => {
      const store = useConversationMetadataStore.getState();

      // Add multiple conversations
      store.setMetadata("conv1", {
        title: { value: "Title 1", timestamp: 1000 }
      });
      store.setMetadata("conv2", {
        title: { value: "Title 2", timestamp: 1000 }
      });

      // Verify they exist
      expect(store.getMetadata("conv1")).toBeDefined();
      expect(store.getMetadata("conv2")).toBeDefined();

      // Clear all
      store.clearMetadata();

      // Verify all are gone
      expect(store.getMetadata("conv1")).toBeUndefined();
      expect(store.getMetadata("conv2")).toBeUndefined();
    });
  });
});