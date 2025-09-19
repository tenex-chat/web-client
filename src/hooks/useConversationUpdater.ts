import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";

/**
 * Custom hook for updating conversation metadata
 * Encapsulates the logic for publishing kind:513 events
 */
export function useConversationUpdater(rootEventId?: string) {
  const { ndk } = useNDK();

  /**
   * Private helper to publish conversation metadata events
   * @param metadataTag - The tag to add (e.g., ["title", value] or ["summary", value])
   * @param successMessage - Message to show on success
   * @param errorMessage - Message to show on error
   * @returns Promise<boolean> indicating success or failure
   */
  const publishMetadata = async (
    metadataTag: [string, string],
    successMessage: string,
    errorMessage: string
  ): Promise<boolean> => {
    if (!ndk || !rootEventId || !metadataTag[1].trim()) {
      return false;
    }

    try {
      const metadataEvent = new NDKEvent(ndk);
      metadataEvent.kind = 513; // Conversation metadata kind
      metadataEvent.content = ""; // Content should be empty for kind:513
      metadataEvent.tags = [
        ["e", rootEventId],
        metadataTag
      ];

      await metadataEvent.publish();
      toast.success(successMessage);
      return true;
    } catch (error) {
      console.error(errorMessage, error);
      toast.error(errorMessage);
      return false;
    }
  };

  const updateTitle = async (title: string): Promise<boolean> => {
    return publishMetadata(
      ["title", title.trim()],
      "Title updated successfully",
      "Failed to update title"
    );
  };

  const updateSummary = async (summary: string): Promise<boolean> => {
    return publishMetadata(
      ["summary", summary.trim()],
      "Summary published successfully",
      "Failed to publish summary"
    );
  };

  return {
    updateTitle,
    updateSummary,
  };
}