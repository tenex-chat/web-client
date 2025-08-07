import { describe, it, expect, vi } from "vitest";
import { safeJsonParse, tryJsonParse } from "./json";
import { logger } from "../logger";

// Mock the logger
vi.mock("../logger", () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe("JSON utilities", () => {
    describe("safeJsonParse", () => {
        it("should parse valid JSON", () => {
            const result = safeJsonParse('{"test": "value"}', {});
            expect(result).toEqual({ test: "value" });
        });

        it("should return default value for invalid JSON", () => {
            const defaultValue = { default: true };
            const result = safeJsonParse("invalid json", defaultValue);
            expect(result).toBe(defaultValue);
            expect(logger.error).toHaveBeenCalled();
        });

        it("should handle arrays", () => {
            const result = safeJsonParse('[1, 2, 3]', []);
            expect(result).toEqual([1, 2, 3]);
        });

        it("should handle primitives", () => {
            expect(safeJsonParse('"string"', "")).toBe("string");
            expect(safeJsonParse("123", 0)).toBe(123);
            expect(safeJsonParse("true", false)).toBe(true);
        });
    });

    describe("tryJsonParse", () => {
        beforeEach(() => {
            vi.clearAllMocks();
        });

        it("should parse valid JSON", () => {
            const result = tryJsonParse<{ test: string }>('{"test": "value"}');
            expect(result).toEqual({ test: "value" });
        });

        it("should return null for invalid JSON", () => {
            const result = tryJsonParse("invalid json");
            expect(result).toBeNull();
        });

        it("should handle arrays", () => {
            const result = tryJsonParse<number[]>('[1, 2, 3]');
            expect(result).toEqual([1, 2, 3]);
        });

        it("should log errors for invalid JSON", () => {
            tryJsonParse("invalid json");
            expect(logger.error).toHaveBeenCalledWith(
                "Failed to parse JSON in tryJsonParse:",
                expect.any(Error)
            );
        });
    });
});