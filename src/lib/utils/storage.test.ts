import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Storage, createNamespacedStorage } from "./storage";
import { logger } from "@/lib/logger";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("Storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("getItem", () => {
    it("retrieves and parses stored items", () => {
      localStorage.setItem("test-key", JSON.stringify({ value: "test" }));
      const result = Storage.getItem<{ value: string }>("test-key");
      expect(result).toEqual({ value: "test" });
    });

    it("returns default value when item does not exist", () => {
      const defaultValue = { value: "default" };
      const result = Storage.getItem("non-existent", defaultValue);
      expect(result).toEqual(defaultValue);
    });

    it("returns default value on parse error", () => {
      localStorage.setItem("invalid-json", "not-json");
      const defaultValue = { value: "default" };
      const result = Storage.getItem("invalid-json", defaultValue);
      expect(result).toEqual(defaultValue);
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe("setItem", () => {
    it("stores items as JSON", () => {
      const success = Storage.setItem("test-key", { value: "test" });
      expect(success).toBe(true);
      expect(localStorage.getItem("test-key")).toBe('{"value":"test"}');
    });

    it("handles storage errors gracefully", () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn().mockImplementation(() => {
        throw new Error("Storage full");
      });

      const success = Storage.setItem("test-key", { value: "test" });
      expect(success).toBe(false);
      expect(logger.error).toHaveBeenCalled();

      localStorage.setItem = originalSetItem;
    });
  });

  describe("removeItem", () => {
    it("removes items from storage", () => {
      localStorage.setItem("test-key", "value");
      Storage.removeItem("test-key");
      expect(localStorage.getItem("test-key")).toBeNull();
    });
  });

  describe("hasItem", () => {
    it("checks if item exists", () => {
      localStorage.setItem("exists", "value");
      expect(Storage.hasItem("exists")).toBe(true);
      expect(Storage.hasItem("not-exists")).toBe(false);
    });
  });

  describe("clear", () => {
    it("clears all items", () => {
      localStorage.setItem("key1", "value1");
      localStorage.setItem("key2", "value2");
      Storage.clear();
      expect(localStorage.length).toBe(0);
    });
  });
});

describe("createNamespacedStorage", () => {
  const testStorage = createNamespacedStorage("test-ns");

  beforeEach(() => {
    localStorage.clear();
  });

  it("prefixes keys with namespace", () => {
    testStorage.setItem("key", "value");
    expect(localStorage.getItem("test-ns:key")).toBe('"value"');
    expect(localStorage.getItem("key")).toBeNull();
  });

  it("retrieves namespaced items", () => {
    localStorage.setItem("test-ns:key", '"namespaced"');
    const result = testStorage.getItem<string>("key");
    expect(result).toBe("namespaced");
  });

  it("checks existence with namespace", () => {
    localStorage.setItem("test-ns:exists", "value");
    expect(testStorage.hasItem("exists")).toBe(true);
    expect(testStorage.hasItem("not-exists")).toBe(false);
  });

  it("removes namespaced items", () => {
    localStorage.setItem("test-ns:key", "value");
    testStorage.removeItem("key");
    expect(localStorage.getItem("test-ns:key")).toBeNull();
  });
});
