import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTimeFormat } from "./useTimeFormat";

describe("useTimeFormat", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2024-01-15T12:00:00Z"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("formatRelativeTime", () => {
        it("should format time as 'just now' for recent timestamps", () => {
            const { result } = renderHook(() => useTimeFormat());
            const now = Math.floor(Date.now() / 1000);
            expect(result.current.formatRelativeTime(now)).toBe("just now");
        });

        it("should format time in minutes for recent past", () => {
            const { result } = renderHook(() => useTimeFormat());
            const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
            expect(result.current.formatRelativeTime(fiveMinutesAgo)).toBe("5m ago");
        });

        it("should format time in hours for same day", () => {
            const { result } = renderHook(() => useTimeFormat());
            const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 60 * 60;
            expect(result.current.formatRelativeTime(twoHoursAgo)).toBe("2h ago");
        });

        it("should format time in days for recent days", () => {
            const { result } = renderHook(() => useTimeFormat());
            const threeDaysAgo = Math.floor(Date.now() / 1000) - 3 * 24 * 60 * 60;
            expect(result.current.formatRelativeTime(threeDaysAgo)).toBe("3d ago");
        });

        it("should format with short format when specified", () => {
            const { result } = renderHook(() => useTimeFormat({ relativeFormat: "short" }));
            const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
            expect(result.current.formatRelativeTime(fiveMinutesAgo)).toBe("5m");
        });
    });

    describe("formatAbsoluteTime", () => {
        it("should format with time when includeTime is true", () => {
            const { result } = renderHook(() => useTimeFormat({ includeTime: true }));
            const timestamp = Math.floor(new Date("2024-01-10T15:30:00Z").getTime() / 1000);
            const formatted = result.current.formatAbsoluteTime(timestamp);
            expect(formatted).toContain("Jan 10");
        });

        it("should format without time when includeTime is false", () => {
            const { result } = renderHook(() => useTimeFormat({ includeTime: false }));
            const timestamp = Math.floor(new Date("2024-01-10T15:30:00Z").getTime() / 1000);
            const formatted = result.current.formatAbsoluteTime(timestamp);
            expect(formatted).toBe("Jan 10, 2024");
        });
    });

    describe("formatDuration", () => {
        it("should format seconds", () => {
            const { result } = renderHook(() => useTimeFormat());
            expect(result.current.formatDuration(45)).toBe("45s");
        });

        it("should format minutes and seconds", () => {
            const { result } = renderHook(() => useTimeFormat());
            expect(result.current.formatDuration(125)).toBe("2m 5s");
        });

        it("should format minutes without seconds", () => {
            const { result } = renderHook(() => useTimeFormat());
            expect(result.current.formatDuration(180)).toBe("3m");
        });

        it("should format hours and minutes", () => {
            const { result } = renderHook(() => useTimeFormat());
            expect(result.current.formatDuration(3725)).toBe("1h 2m");
        });

        it("should format hours without minutes", () => {
            const { result } = renderHook(() => useTimeFormat());
            expect(result.current.formatDuration(7200)).toBe("2h");
        });

        it("should format days and hours", () => {
            const { result } = renderHook(() => useTimeFormat());
            expect(result.current.formatDuration(90000)).toBe("1d 1h");
        });

        it("should format days without hours", () => {
            const { result } = renderHook(() => useTimeFormat());
            expect(result.current.formatDuration(172800)).toBe("2d");
        });
    });

    describe("format", () => {
        it("should use relative format when style is relative", () => {
            const { result } = renderHook(() => useTimeFormat({ style: "relative" }));
            const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
            expect(result.current.format(fiveMinutesAgo)).toBe("5m ago");
        });

        it("should use absolute format when style is absolute", () => {
            const { result } = renderHook(() => useTimeFormat({ style: "absolute" }));
            const timestamp = Math.floor(new Date("2024-01-10T15:30:00Z").getTime() / 1000);
            const formatted = result.current.format(timestamp);
            expect(formatted).toContain("Jan 10");
        });

        it("should use auto format when style is auto", () => {
            const { result } = renderHook(() => useTimeFormat({ style: "auto" }));
            const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 5 * 60;
            expect(result.current.format(fiveMinutesAgo)).toBe("5m ago");
        });

        it("should allow style override", () => {
            const { result } = renderHook(() => useTimeFormat({ style: "relative" }));
            const timestamp = Math.floor(new Date("2024-01-10T15:30:00Z").getTime() / 1000);
            const formatted = result.current.format(timestamp, "absolute");
            expect(formatted).toContain("Jan 10");
        });
    });

    describe("utility functions", () => {
        it("should format time only", () => {
            const { result } = renderHook(() => useTimeFormat({ use24Hour: false }));
            const timestamp = Math.floor(new Date("2024-01-10T15:30:00Z").getTime() / 1000);
            const formatted = result.current.formatTimeOnly(timestamp);
            expect(formatted).toMatch(/\d{1,2}:\d{2}\s(AM|PM)/);
        });

        it("should format date only", () => {
            const { result } = renderHook(() => useTimeFormat());
            const timestamp = Math.floor(new Date("2024-01-10T15:30:00Z").getTime() / 1000);
            expect(result.current.formatDateOnly(timestamp)).toBe("Jan 10, 2024");
        });
    });
});