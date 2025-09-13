import { useState, useCallback } from "react";
import { NDKEvent, NDKUser } from "@nostr-dev-kit/ndk-hooks";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import { EVENT_KINDS } from "@/lib/constants";
import { NDKProject } from "@/lib/ndk-events/NDKProject";

interface UseModelSwitchingOptions {
  event: NDKEvent;
  project: NDKProject;
  user?: NDKUser;
}

/**
 * Hook for handling LLM model switching functionality
 * Encapsulates the business logic for changing models on events
 */
export function useModelSwitching({
  event,
  project,
  user,
}: UseModelSwitchingOptions) {
  const { ndk } = useNDK();
  const [isChangingModel, setIsChangingModel] = useState(false);

  const handleModelChange = useCallback(
    async (newModel: string) => {
      if (!ndk || !user || isChangingModel) return;

      setIsChangingModel(true);
      try {
        // Parse the model string (format: "provider/model")
        const [provider, ...modelParts] = newModel.split("/");
        const model = modelParts.join("/");

        // Create a model change event (kind 24101)
        const modelChangeEvent = new NDKEvent(ndk);
        modelChangeEvent.kind = EVENT_KINDS.LLM_CONFIG_CHANGE;
        modelChangeEvent.content = JSON.stringify({
          action: "change_model",
          provider,
          model,
          timestamp: Date.now(),
        });
        modelChangeEvent.tags = [
          ["e", event.id], // Reference the message we're changing the model for
          ["a", project.tagId()], // Reference the project
          ["provider", provider],
          ["model", model],
        ];

        await modelChangeEvent.publish();
        toast.success(`Model changed to ${model}`);
      } catch (error) {
        console.error("Failed to change model:", error);
        toast.error("Failed to change model");
      } finally {
        setIsChangingModel(false);
      }
    },
    [ndk, user, event.id, project, isChangingModel],
  );

  return {
    handleModelChange,
    isChangingModel,
  };
}
