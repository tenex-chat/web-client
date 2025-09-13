import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logger } from "./logger";

describe("Logger", () => {
  const originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };

  beforeEach(() => {
    // Mock console methods
    console.log = vi.fn();
    console.info = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Mock Date to have consistent timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T12:00:00.000Z"));
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsole.log;
    console.info = originalConsole.info;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    // Restore timers
    vi.useRealTimers();
  });

  describe("logging methods", () => {
    it("should log debug messages with timestamp", () => {
      logger.debug("Debug message", { extra: "data" });

      expect(console.log).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [DEBUG]",
        "Debug message",
        { extra: "data" },
      );
    });

    it("should log info messages with timestamp", () => {
      logger.info("Info message", 123);

      expect(console.info).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [INFO]",
        "Info message",
        123,
      );
    });

    it("should log warn messages with timestamp", () => {
      logger.warn("Warning message");

      expect(console.warn).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [WARN]",
        "Warning message",
      );
    });

    it("should log error messages with timestamp", () => {
      const error = new Error("Test error");
      logger.error("Error occurred", error);

      expect(console.error).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [ERROR]",
        "Error occurred",
        error,
      );
    });

    it("should handle multiple arguments", () => {
      logger.info("Multiple", "arguments", { test: true }, [1, 2, 3]);

      expect(console.info).toHaveBeenCalledWith(
        "[2024-01-01T12:00:00.000Z] [INFO]",
        "Multiple",
        "arguments",
        { test: true },
        [1, 2, 3],
      );
    });
  });

  describe("timestamp formatting", () => {
    it("should use ISO string format for timestamps", () => {
      const testDate = new Date("2024-12-25T18:30:45.123Z");
      vi.setSystemTime(testDate);

      logger.info("Test message");

      expect(console.info).toHaveBeenCalledWith(
        "[2024-12-25T18:30:45.123Z] [INFO]",
        "Test message",
      );
    });
  });
});
