import { describe, it, expect, vi, beforeEach } from "vitest";
import { bringProjectOnline } from "./projectStatusUtils";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk-hooks";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("projectStatusUtils", () => {
  let mockProject: NDKProject;
  let mockNDK: NDK;
  let mockPublish: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPublish = vi.fn().mockResolvedValue(undefined);

    // Create a mock project
    mockProject = {
      title: "Test Project",
      tagId: vi.fn().mockReturnValue("31933:pubkey123:test-project"),
    } as unknown as NDKProject;

    // Create a mock NDK instance
    mockNDK = {} as NDK;

    // Mock NDKEvent constructor and publish method
    vi.spyOn(NDKEvent.prototype, "publish").mockImplementation(mockPublish);
  });

  describe("bringProjectOnline", () => {
    it("should create and publish a 24000 event with project tag", async () => {
      await bringProjectOnline(mockProject, mockNDK);

      expect(mockPublish).toHaveBeenCalledTimes(1);
      expect(mockProject.tagId).toHaveBeenCalled();
    });

    it("should throw error if ndk is missing", async () => {
      await expect(
        bringProjectOnline(mockProject, null as any),
      ).rejects.toThrow("Missing required parameters");
    });

    it("should throw error if project is missing", async () => {
      await expect(bringProjectOnline(null as any, mockNDK)).rejects.toThrow(
        "Missing required parameters",
      );
    });

    it("should handle publish failures gracefully", async () => {
      mockPublish.mockRejectedValueOnce(new Error("Network error"));

      await expect(bringProjectOnline(mockProject, mockNDK)).rejects.toThrow();
      expect(mockPublish).toHaveBeenCalledTimes(1);
    });
  });
});
