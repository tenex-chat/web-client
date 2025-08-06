import { useState } from "react";

interface Entity {
    id: string;
    encode(): string;
    delete(): Promise<void>;
}

interface UseEntityActionsReturn<T extends Entity> {
    copiedId: string | null;
    copyEntityId: (entity: T) => Promise<void>;
    deleteEntity: (entity: T, entityName: string, onSuccess?: () => void) => Promise<void>;
}

export function useEntityActions<T extends Entity>(): UseEntityActionsReturn<T> {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const copyEntityId = async (entity: T) => {
        try {
            const encoded = entity.encode();
            await navigator.clipboard.writeText(encoded);
            setCopiedId(entity.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // Silent fail - consistent with existing codebase pattern
        }
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