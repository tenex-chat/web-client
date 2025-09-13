import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk-hooks";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";
import { EVENT_KINDS } from "@/lib/constants";
import { toast } from "sonner";

/**
 * Brings a project online by publishing a 24000 event
 * @param project The project to bring online
 * @param ndk The NDK instance
 * @returns Promise that resolves when the event is published
 */
export async function bringProjectOnline(
  project: NDKProject,
  ndk: NDK,
): Promise<void> {
  if (!ndk || !project) {
    throw new Error("Missing required parameters");
  }

  try {
    // Create a 24000 event to start the project
    const event = new NDKEvent(ndk);
    event.kind = EVENT_KINDS.PROJECT_START;
    event.content = "";

    // Tag the project using its NIP-33 reference
    const projectTag = project.tagId();
    if (projectTag) {
      event.tags.push(["a", projectTag]);
    }

    await event.publish();
    toast.success(`Project "${project.title}" is now online`);
  } catch (error) {
    console.error("Failed to bring project online:", error);
    toast.error("Failed to bring project online");
    throw error;
  }
}
