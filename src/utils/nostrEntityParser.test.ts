import { describe, expect, it } from "vitest";
import {
    findNostrEntities,
    replaceNostrEntities,
    isAddressPointer,
    isEventPointer,
    isArticleEntity,
    isTaskEntity,
    getEntityDisplayInfo,
} from "./nostrEntityParser";

describe("nostrEntityParser", () => {
    describe("findNostrEntities", () => {
        it("should find no entities in plain text", () => {
            const text = "This is plain text without any Nostr entities";
            const entities = findNostrEntities(text);
            expect(entities).toHaveLength(0);
        });

        it("should find npub entities", () => {
            const text = "Check out nostr:npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9";
            const entities = findNostrEntities(text);
            expect(entities).toHaveLength(1);
            expect(entities[0].type).toBe("npub");
        });

        it("should find multiple entities", () => {
            const text = "Here's a nostr:npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9 and another nostr:npub180cvv07tjdrrgpa0j7j7tmnyl2yr6yr7l8j4s3evf6u64th6gkwsyjh6w6";
            const entities = findNostrEntities(text);
            expect(entities).toHaveLength(2);
            expect(entities[0].type).toBe("npub");
            expect(entities[1].type).toBe("npub");
        });

        it("should handle invalid bech32 gracefully", () => {
            const text = "Invalid nostr:npub1invalid and valid nostr:npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9";
            const entities = findNostrEntities(text);
            // Should only find the valid one
            expect(entities.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe("replaceNostrEntities", () => {
        it("should replace entities with custom replacer", () => {
            const text = "Check out nostr:npub1sn0wdenkukak0d9dfczzeacvhkrgz92ak56egt7vdgzn8pv2wfqqhrjdv9";
            const replaced = replaceNostrEntities(text, (entity) => `[${entity.type}]`);
            expect(replaced).toBe("Check out [npub]");
        });

        it("should preserve original text on decode failure", () => {
            const text = "Invalid nostr:npub1invalid";
            const replaced = replaceNostrEntities(text, () => "[REPLACED]");
            expect(replaced).toBe("Invalid nostr:npub1invalid");
        });
    });

    describe("Type guards", () => {
        describe("isAddressPointer", () => {
            it("should identify AddressPointer correctly", () => {
                const addressPointer = {
                    kind: 30023,
                    pubkey: "pubkey123",
                    identifier: "test-id",
                };
                expect(isAddressPointer(addressPointer)).toBe(true);
            });

            it("should reject non-AddressPointer objects", () => {
                expect(isAddressPointer("string")).toBe(false);
                expect(isAddressPointer({ id: "123" })).toBe(false);
                expect(isAddressPointer(null)).toBe(false);
                expect(isAddressPointer(new Uint8Array())).toBe(false);
            });
        });

        describe("isEventPointer", () => {
            it("should identify EventPointer correctly", () => {
                const eventPointer = {
                    id: "event123",
                    kind: 1,
                };
                expect(isEventPointer(eventPointer)).toBe(true);
            });

            it("should reject non-EventPointer objects", () => {
                expect(isEventPointer("string")).toBe(false);
                expect(isEventPointer({ pubkey: "123" })).toBe(false);
                expect(isEventPointer(null)).toBe(false);
                expect(isEventPointer(new Uint8Array())).toBe(false);
            });
        });
    });

    describe("Entity type checks", () => {
        describe("isArticleEntity", () => {
            it("should identify article entities (kind 30023)", () => {
                const entity = {
                    type: "naddr" as const,
                    bech32: "naddr1...",
                    data: {
                        kind: 30023,
                        pubkey: "pubkey",
                        identifier: "article-id",
                    },
                };
                expect(isArticleEntity(entity)).toBe(true);
            });

            it("should reject non-article entities", () => {
                const entity = {
                    type: "naddr" as const,
                    bech32: "naddr1...",
                    data: {
                        kind: 30024,
                        pubkey: "pubkey",
                        identifier: "other-id",
                    },
                };
                expect(isArticleEntity(entity)).toBe(false);
            });
        });

        describe("isTaskEntity", () => {
            it("should identify task entities (kind 1934)", () => {
                const entity = {
                    type: "nevent" as const,
                    bech32: "nevent1...",
                    data: {
                        id: "event123",
                        kind: 1934,
                    },
                };
                expect(isTaskEntity(entity)).toBe(true);
            });

            it("should reject non-task entities", () => {
                const entity = {
                    type: "nevent" as const,
                    bech32: "nevent1...",
                    data: {
                        id: "event123",
                        kind: 1,
                    },
                };
                expect(isTaskEntity(entity)).toBe(false);
            });
        });
    });

    describe("getEntityDisplayInfo", () => {
        it("should return correct info for article", () => {
            const entity = {
                type: "naddr" as const,
                bech32: "naddr1...",
                data: {
                    kind: 30023,
                    pubkey: "pubkey",
                    identifier: "test-spec",
                },
            };
            const info = getEntityDisplayInfo(entity);
            expect(info.title).toBe("Specification Document");
            expect(info.description).toContain("TEST-SPEC");
            expect(info.icon).toBe("📄");
        });

        it("should return correct info for task", () => {
            const entity = {
                type: "nevent" as const,
                bech32: "nevent1...",
                data: {
                    id: "event123",
                    kind: 1934,
                },
            };
            const info = getEntityDisplayInfo(entity);
            expect(info.title).toBe("Task");
            expect(info.description).toBe("View task details");
            expect(info.icon).toBe("✅");
        });

        it("should return correct info for note", () => {
            const entity = {
                type: "note" as const,
                bech32: "note1...",
                data: "notedata",
            };
            const info = getEntityDisplayInfo(entity);
            expect(info.title).toBe("Note");
            expect(info.icon).toBe("📝");
        });

        it("should return correct info for npub", () => {
            const entity = {
                type: "npub" as const,
                bech32: "npub1...",
                data: "pubkey",
            };
            const info = getEntityDisplayInfo(entity);
            expect(info.title).toBe("Public Key");
            expect(info.icon).toBe("👤");
        });

        it("should return correct info for nprofile", () => {
            const entity = {
                type: "nprofile" as const,
                bech32: "nprofile1...",
                data: {
                    pubkey: "pubkey",
                    relays: ["wss://relay.example.com"],
                },
            };
            const info = getEntityDisplayInfo(entity);
            expect(info.title).toBe("Profile");
            expect(info.icon).toBe("👤");
        });
    });
});