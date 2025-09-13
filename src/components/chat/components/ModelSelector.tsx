import React, { useCallback } from "react";
import { Check, ChevronDown, ChevronsDown, ChevronsUpDown, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { NDKEvent, useNDK } from "@nostr-dev-kit/ndk-hooks";
import { toast } from "sonner";
import type { ProjectModel } from "@/lib/ndk-events/NDKProjectStatus";
import type { NDKProject } from "@/lib/ndk-events/NDKProject";

interface ModelSelectorProps {
  selectedAgentPubkey: string | null;
  selectedAgentModel?: string;
  availableModels: ProjectModel[];
  project: NDKProject;
  disabled?: boolean;
  className?: string;
}

export function ModelSelector({
  selectedAgentPubkey,
  selectedAgentModel,
  availableModels,
  project,
  disabled = false,
  className,
}: ModelSelectorProps) {
  const { ndk } = useNDK();
  const [open, setOpen] = React.useState(false);
  const [selectedModel, setSelectedModel] = React.useState<string | null>(
    selectedAgentModel || null,
  );
  const [isChanging, setIsChanging] = React.useState(false);

  // Update selected model when agent changes
  React.useEffect(() => {
    setSelectedModel(selectedAgentModel || null);
  }, [selectedAgentModel]);

  const handleModelChange = useCallback(
    async (modelSlug: string) => {
      if (!ndk || !selectedAgentPubkey || !project) {
        toast.error("Unable to change model: missing required information");
        setOpen(false);
        return;
      }

      // If selecting the same model, just close
      if (modelSlug === selectedModel) {
        setOpen(false);
        return;
      }

      setIsChanging(true);
      try {
        const projectTagId = project.tagId();
        if (!projectTagId) {
          toast.error("Project tag ID not found");
          setIsChanging(false);
          setOpen(false);
          return;
        }

        // Create a Kind 24020 event to change the agent's model
        const changeEvent = new NDKEvent(ndk);
        changeEvent.kind = 24020;
        changeEvent.content = "";

        changeEvent.tags = [
          ["p", selectedAgentPubkey], // Target agent
          ["model", modelSlug], // New model slug
          ["a", projectTagId], // Project reference
        ];

        // Note: We're not including tool tags here, which means
        // the agent will keep its existing tools configuration

        await changeEvent.sign();
        await changeEvent.publish();

        // Update local state immediately for responsive UI
        setSelectedModel(modelSlug);
        toast.success(`Model changed to ${modelSlug}`);
      } catch (error) {
        console.error("Failed to change model:", error);
        toast.error("Failed to change model");
      } finally {
        setIsChanging(false);
        setOpen(false);
      }
    },
    [ndk, selectedAgentPubkey, project, selectedModel],
  );

  if (!selectedAgentPubkey || availableModels.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isChanging}
          className={cn(
            "justify-between h-9 px-2",
            "bg-transparent border-0",
            "hover:bg-accent/30",
            "transition-all duration-200",
            className,
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-sm truncate">
              {selectedModel || "Select model"}
            </span>
          </div>
          <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0 border-0 bg-popover/95 backdrop-blur-sm shadow-sm ring-1 ring-border/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring" align="start">
        <Command>
          <CommandInput placeholder="Search models..." className="h-9" />
          <CommandList>
            <CommandEmpty>No models found.</CommandEmpty>
            <CommandGroup heading="Available Models">
              {availableModels.map((model) => (
                <CommandItem
                  key={model.name}
                  value={model.name}
                  onSelect={() => handleModelChange(model.name)}
                  className="cursor-pointer"
                  disabled={isChanging}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Cpu className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{model.name}</span>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4 flex-shrink-0",
                      selectedModel === model.name
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
