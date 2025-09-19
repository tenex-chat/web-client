import { describe, it, expect } from "vitest";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { 
  extractConversationId,
  processConversationMetadataEvent,
  ProcessedMetadataResult 
} from "../conversationMetadataProcessor";

describe("conversationMetadataProcessor", () => {
  describe("extractConversationId", () => {
    it("should extract conversation ID from uppercase E tag", () => {
      const event = {
        tags: [
          ["p", "pubkey123"],
          ["E", "conversation-id-123"],
          ["t", "test"]
        ]
      } as unknown as NDKEvent;

      expect(extractConversationId(event)).toBe("conversation-id-123");
    });

    it("should return undefined for missing E tag", () => {
      const event = {
        tags: [
          ["p", "pubkey123"],
          ["e", "regular-event-ref"],  // lowercase e should be ignored
          ["t", "test"]
        ]
      } as unknown as NDKEvent;

      expect(extractConversationId(event)).toBeUndefined();
    });

    it("should return undefined for undefined event", () => {
      expect(extractConversationId(undefined)).toBeUndefined();
    });

    it("should handle empty tags array", () => {
      const event = {
        tags: []
      } as unknown as NDKEvent;

      expect(extractConversationId(event)).toBeUndefined();
    });

    it("should ignore lowercase e tags and only use uppercase E", () => {
      const event = {
        tags: [
          ["e", "wrong-id-lowercase"],  // Should be ignored
          ["E", "correct-id-uppercase"], // Should be used
          ["e", "another-wrong-id"]
        ]
      } as unknown as NDKEvent;

      expect(extractConversationId(event)).toBe("correct-id-uppercase");
    });
  });

  describe("processConversationMetadataEvent", () => {
    describe("Successful processing", () => {
      it("should process event with title in tags", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title", "Test Title"]
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.conversationId).toBe("conv-123");
          expect(result.title?.value).toBe("Test Title");
          expect(result.title?.timestamp).toBe(1000);
          expect(result.summary).toBeUndefined();
        }
      });

      it("should process event with summary tag", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["summary", "Test Summary"]
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.conversationId).toBe("conv-123");
          expect(result.summary?.value).toBe("Test Summary");
          expect(result.summary?.timestamp).toBe(1000);
          expect(result.title).toBeUndefined();
        }
      });

      it("should process event with both title and summary", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title", "Test Title"],
            ["summary", "Test Summary"]
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.conversationId).toBe("conv-123");
          expect(result.title?.value).toBe("Test Title");
          expect(result.summary?.value).toBe("Test Summary");
        }
      });
    });

    describe("Cumulative update logic", () => {
      it("should not update title when existing is newer", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title", "Old Title"]
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const currentMetadata = {
          title: { value: "Newer Title", timestamp: 2000 }
        };

        const result = processConversationMetadataEvent(event, currentMetadata);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.title).toBeUndefined(); // Should not update
        }
      });

      it("should update title when new is newer", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title", "Newer Title"]
          ],
          content: "",
          created_at: 2000
        } as unknown as NDKEvent;

        const currentMetadata = {
          title: { value: "Old Title", timestamp: 1000 }
        };

        const result = processConversationMetadataEvent(event, currentMetadata);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.title?.value).toBe("Newer Title");
          expect(result.title?.timestamp).toBe(2000);
        }
      });

      it("should handle equal timestamps (no update)", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title", "Same Time Title"]
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const currentMetadata = {
          title: { value: "Existing Title", timestamp: 1000 }
        };

        const result = processConversationMetadataEvent(event, currentMetadata);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.title).toBeUndefined(); // Should not update when equal
        }
      });
    });

    describe("Error handling", () => {
      it("should handle missing e tag", () => {
        const event = {
          id: "event-123",
          tags: [["p", "pubkey"]],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("Missing required conversation ID");
          expect(result.eventId).toBe("event-123");
        }
      });

      it("should handle missing created_at", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title", "Test"]
          ],
          content: "",
          created_at: undefined
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain("Missing created_at timestamp");
          expect(result.eventId).toBe("event-123");
        }
      });

      it("should handle event with only summary tag", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["summary", "Still has summary"]
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        // Should still succeed if we have summary
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.title).toBeUndefined();
          expect(result.summary?.value).toBe("Still has summary");
        }
      });

      it("should handle event with no metadata tags", () => {
        const event = {
          id: "event-123",
          tags: [["e", "conv-123"]],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        // Should succeed but with no metadata
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.title).toBeUndefined();
          expect(result.summary).toBeUndefined();
        }
      });
    });

    describe("Edge cases", () => {
      it("should handle title tag with non-string value", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title"] // Missing value
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.title).toBeUndefined(); // Should not extract invalid title
        }
      });

      it("should handle empty string values", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title", ""], // Empty title
            ["summary", ""] // Empty summary
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(true);
        if (result.success) {
          // Empty strings are still valid values
          expect(result.title?.value).toBe("");
          expect(result.summary?.value).toBe("");
        }
      });

      it("should handle very large timestamps", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["title", "Future Title"]
          ],
          content: "",
          created_at: Number.MAX_SAFE_INTEGER
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.title?.timestamp).toBe(Number.MAX_SAFE_INTEGER);
        }
      });

      it("should handle multiple e tags (use first)", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-first"],
            ["e", "conv-second"],
            ["e", "conv-third"],
            ["title", "Test"]
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.conversationId).toBe("conv-first");
        }
      });

      it("should handle multiple summary tags (use first)", () => {
        const event = {
          id: "event-123",
          tags: [
            ["e", "conv-123"],
            ["summary", "First Summary"],
            ["summary", "Second Summary"]
          ],
          content: "",
          created_at: 1000
        } as unknown as NDKEvent;

        const result = processConversationMetadataEvent(event);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.summary?.value).toBe("First Summary");
        }
      });
    });
  });
});