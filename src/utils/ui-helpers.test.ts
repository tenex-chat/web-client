import { describe, it, expect } from "vitest";
import {
    getEntityAvatar,
    getInitials,
    extractTags,
    filterEntities,
    createTagSearchFilter,
    formatRelativeTime,
} from "./ui-helpers";

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

    describe("getInitials", () => {
        it("should extract initials from single word", () => {
            expect(getInitials("John")).toBe("J");
        });

        it("should extract initials from two words", () => {
            expect(getInitials("John Doe")).toBe("JD");
        });

        it("should extract initials from multiple words and limit to 2", () => {
            expect(getInitials("John Michael Doe")).toBe("JM");
        });

        it("should handle empty string with default fallback", () => {
            expect(getInitials("")).toBe("UN");
        });

        it("should handle undefined with default fallback", () => {
            expect(getInitials(undefined)).toBe("UN");
        });

        it("should use custom fallback when provided", () => {
            expect(getInitials("", "XX")).toBe("XX");
        });

        it("should convert to uppercase", () => {
            expect(getInitials("john doe")).toBe("JD");
        });
    });

    describe("extractTags", () => {
        it("should extract tags of default type", () => {
            const tags: Array<[string, string]> = [
                ["t", "bitcoin"],
                ["p", "pubkey123"],
                ["t", "nostr"],
                ["e", "event123"],
            ];
            expect(extractTags(tags)).toEqual(["bitcoin", "nostr"]);
        });

        it("should extract tags of specified type", () => {
            const tags: Array<[string, string]> = [
                ["t", "bitcoin"],
                ["p", "pubkey123"],
                ["p", "pubkey456"],
            ];
            expect(extractTags(tags, "p")).toEqual(["pubkey123", "pubkey456"]);
        });

        it("should filter out empty tag values", () => {
            const tags: Array<[string, string]> = [
                ["t", "bitcoin"],
                ["t", ""],
                ["t", "nostr"],
            ];
            expect(extractTags(tags)).toEqual(["bitcoin", "nostr"]);
        });

        it("should return empty array when no matching tags", () => {
            const tags: Array<[string, string]> = [
                ["p", "pubkey123"],
                ["e", "event123"],
            ];
            expect(extractTags(tags)).toEqual([]);
        });
    });

    describe("filterEntities", () => {
        const entities = [
            { name: "Bitcoin", description: "Digital currency" },
            { name: "Ethereum", description: "Smart contract platform" },
            { name: "Nostr", description: "Decentralized social protocol" },
        ];

        it("should return all entities when search term is empty", () => {
            expect(filterEntities(entities, "")).toEqual(entities);
        });

        it("should filter by name", () => {
            const result = filterEntities(entities, "bit");
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Bitcoin");
        });

        it("should filter by description", () => {
            const result = filterEntities(entities, "social");
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Nostr");
        });

        it("should be case insensitive", () => {
            const result = filterEntities(entities, "BITCOIN");
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Bitcoin");
        });

        it("should filter using additional fields", () => {
            const entitiesWithTags = [
                { name: "Bitcoin", description: "Digital currency", tags: ["crypto", "money"] },
                { name: "Nostr", description: "Protocol", tags: ["social", "decentralized"] },
            ];
            
            const result = filterEntities(
                entitiesWithTags,
                "money",
                (entity) => entity.tags
            );
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe("Bitcoin");
        });
    });

    describe("createTagSearchFilter", () => {
        interface TaggedItem {
            id: string;
            tags: string[];
        }

        const items: TaggedItem[] = [
            { id: "1", tags: ["bitcoin", "crypto"] },
            { id: "2", tags: ["ethereum", "defi"] },
            { id: "3", tags: ["nostr", "social"] },
        ];

        const filter = createTagSearchFilter<TaggedItem>((item) => item.tags);

        it("should match items with matching tags", () => {
            expect(filter(items[0], "bitcoin")).toBe(true);
            expect(filter(items[0], "crypto")).toBe(true);
        });

        it("should not match items without matching tags", () => {
            expect(filter(items[0], "ethereum")).toBe(false);
            expect(filter(items[0], "social")).toBe(false);
        });

        it("should be case insensitive", () => {
            expect(filter(items[0], "BITCOIN")).toBe(true);
            expect(filter(items[0], "BitCoin")).toBe(true);
        });

        it("should match partial tag names", () => {
            expect(filter(items[0], "bit")).toBe(true);
            expect(filter(items[0], "cryp")).toBe(true);
        });
    });

    describe("formatRelativeTime", () => {
        const now = Date.now() / 1000;

        it("should format as 'just now' for recent timestamps", () => {
            expect(formatRelativeTime(now - 30)).toBe("just now");
        });

        it("should format as minutes ago", () => {
            expect(formatRelativeTime(now - 150)).toBe("2m ago");
            expect(formatRelativeTime(now - 3000)).toBe("50m ago");
        });

        it("should format as hours ago", () => {
            expect(formatRelativeTime(now - 7200)).toBe("2h ago");
            expect(formatRelativeTime(now - 36000)).toBe("10h ago");
        });

        it("should format as days ago", () => {
            expect(formatRelativeTime(now - 172800)).toBe("2d ago");
            expect(formatRelativeTime(now - 518400)).toBe("6d ago");
        });

        it("should format as date for older timestamps", () => {
            const oldTimestamp = now - 1209600; // 14 days ago
            const result = formatRelativeTime(oldTimestamp);
            expect(result).toContain("/");
        });
    });
});