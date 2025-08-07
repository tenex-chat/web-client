import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { useCallback } from "react";
import { NDKMCPTool } from "@/events";
import { type FormValidators, useFormDialogState } from "./useDialogState";

interface MCPToolFormData extends Record<string, unknown> {
    title: string;
    description: string;
    command: string;
    image: string;
    tags: string[];
    newTag: string;
    paths: string[];
    newPath: string;
    env: Record<string, string>;
    newEnvKey: string;
    newEnvValue: string;
}

const initialFormData: MCPToolFormData = {
    title: "",
    description: "",
    command: "",
    image: "",
    tags: [],
    newTag: "",
    paths: [],
    newPath: "",
    env: {},
    newEnvKey: "",
    newEnvValue: "",
};

const validators: FormValidators<MCPToolFormData> = {
    title: (value) => (typeof value === "string" && !value.trim() ? "Title is required" : null),
    description: (value) =>
        typeof value === "string" && !value.trim() ? "Description is required" : null,
    command: (value) => (typeof value === "string" && !value.trim() ? "Command is required" : null),
};

export function useMCPToolForm() {
    const { ndk } = useNDK();
    const formState = useFormDialogState<MCPToolFormData>(initialFormData);

    const loadMCPTool = useCallback(
        (tool: NDKMCPTool) => {
            const toolTags = tool.tags
                .filter((tag) => tag[0] === "t" && tag[1])
                .map((tag) => tag[1] as string);

            formState.loadData({
                title: tool.name || "",
                description: tool.description || "",
                command: tool.command || "",
                image: tool.image || "",
                tags: toolTags,
                newTag: "",
            });
        },
        [formState]
    );

    const validateForm = useCallback((): boolean => {
        return formState.validateAllFields(validators);
    }, [formState]);

    const saveMCPTool = useCallback(
        async (): Promise<boolean> => {
            if (!ndk || !validateForm()) return false;

            const newTool = new NDKMCPTool(ndk);

            // Use NDKMCPTool accessor properties
            newTool.name = formState.data.title;
            newTool.description = formState.data.description;
            newTool.command = formState.data.command;
            
            if (formState.data.image) {
                newTool.image = formState.data.image;
            }

            // Add technology tags
            for (const tag of formState.data.tags) {
                newTool.tags.push(["t", tag]);
            }

            try {
                await newTool.publish();
                return true;
            } catch {
                return false;
            }
        },
        [ndk, formState.data, validateForm]
    );

    const addTag = useCallback(() => {
        const newTag = formState.data.newTag.trim();
        if (newTag && !formState.data.tags.includes(newTag)) {
            formState.addToArrayField("tags", newTag);
            formState.updateField("newTag", "");
        }
    }, [formState]);

    const removeTag = useCallback(
        (tagToRemove: string) => {
            formState.removeFromArrayFieldByValue("tags", tagToRemove);
        },
        [formState]
    );

    const addPath = useCallback(() => {
        const newPath = formState.data.newPath.trim();
        if (newPath && !formState.data.paths.includes(newPath)) {
            formState.addToArrayField("paths", newPath);
            formState.updateField("newPath", "");
        }
    }, [formState]);

    const removePath = useCallback(
        (pathToRemove: string) => {
            formState.removeFromArrayFieldByValue("paths", pathToRemove);
        },
        [formState]
    );

    const addEnvVar = useCallback(() => {
        const key = formState.data.newEnvKey.trim();
        const value = formState.data.newEnvValue.trim();
        if (key && value) {
            formState.updateObjectField("env", key, value);
            formState.updateField("newEnvKey", "");
            formState.updateField("newEnvValue", "");
        }
    }, [formState]);

    const removeEnvVar = useCallback(
        (key: string) => {
            formState.removeObjectField("env", key);
        },
        [formState]
    );

    return {
        // Expose form state
        ...formState,

        // Custom MCP tool methods
        loadMCPTool,
        saveMCPTool,
        validateForm,
        addTag,
        removeTag,
        addPath,
        removePath,
        addEnvVar,
        removeEnvVar,
    };
}