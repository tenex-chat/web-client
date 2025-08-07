import { useState } from "react";
import { useCopyWithFeedback } from "./useCopyWithFeedback";
import type { NDKEvent } from "@nostr-dev-kit/ndk-hooks";

interface UseEntityActionsReturn<T extends NDKEvent> {
    copiedId: string | null;
    copyEntityId: (entity: T) => Promise<void>;
    deleteEntity: (entity: T, entityName: string, onSuccess?: () => void) => Promise<void>;
}

export function useEntityActions<T extends NDKEvent>(): UseEntityActionsReturn<T> {
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const { copyToClipboard } = useCopyWithFeedback();

    const copyEntityId = async (entity: T) => {
        const encoded = entity.encode();
        await copyToClipboard(encoded);
        setCopiedId(entity.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const deleteEntity = async (entity: T, entityName: string, onSuccess?: () => void) => {
        if (!confirm(`Are you sure you want to delete ${entityName}? This action cannot be undone.`)) {
            return;
        }

        try {
            await entity.delete();
            onSuccess?.();
        } catch {
            alert(`Failed to delete ${entityName}. Please try again.`);
        }
    };

    return {
        copiedId,
        copyEntityId,
        deleteEntity,
    };
}