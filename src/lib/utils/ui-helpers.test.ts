import { describe, it, expect } from "vitest";
import { getEntityAvatar } from "./ui-helpers";

describe("ui-helpers", () => {
    describe("getEntityAvatar", () => {
        it("should return provided image URL if available", () => {
            const result = getEntityAvatar("entity-id", "https://example.com/image.jpg");
            expect(result).toBe("https://example.com/image.jpg");
        });

        it("should generate avatar URL with default style", () => {
            const result = getEntityAvatar("test-entity");
            expect(result).toBe("https://api.dicebear.com/7.x/thumbs/svg?seed=test-entity");
        });

        it("should generate avatar URL with custom style", () => {
            const result = getEntityAvatar("test-entity", undefined, "avataaars");
            expect(result).toBe("https://api.dicebear.com/7.x/avataaars/svg?seed=test-entity");
        });

        it("should handle entity IDs with special characters", () => {
            const result = getEntityAvatar("test entity & more");
            expect(result).toContain(encodeURIComponent("test entity & more"));
        });
    });
});