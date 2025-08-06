import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import React from "react";

interface Entity {
    id: string;
    encode(): string;
    delete(): Promise<void>;
}

interface UseEntityActionsReturn<T extends Entity> {
    copiedId: string | null;
    copyEntityId: (entity: T) => Promise<void>;
    deleteEntity: (entity: T, entityName: string, onSuccess?: () => void) => Promise<void>;
    DeleteConfirmationDialog: React.FC;
}

export function useEntityActions<T extends Entity>(): UseEntityActionsReturn<T> {
    const { toast } = useToast();
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [entityToDelete, setEntityToDelete] = useState<{ entity: T; name: string; onSuccess?: () => void } | null>(null);

    const copyEntityId = async (entity: T) => {
        try {
            const encoded = entity.encode();
            await navigator.clipboard.writeText(encoded);
            setCopiedId(entity.id);
            setTimeout(() => setCopiedId(null), 2000);
            toast({
                title: "Copied!",
                description: "Entity ID copied to clipboard",
            });
        } catch (error) {
            toast({
                title: "Failed to copy",
                description: "Could not copy to clipboard",
                variant: "destructive",
            });
        }
    };

    const deleteEntity = async (entity: T, entityName: string, onSuccess?: () => void) => {
        setEntityToDelete({ entity, name: entityName, onSuccess });
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!entityToDelete) return;
        
        try {
            await entityToDelete.entity.delete();
            toast({
                title: "Deleted",
                description: `Successfully deleted ${entityToDelete.name}`,
            });
            entityToDelete.onSuccess?.();
        } catch (error) {
            toast({
                title: "Delete failed",
                description: error instanceof Error ? error.message : "Failed to delete entity",
                variant: "destructive",
            });
        } finally {
            setDeleteDialogOpen(false);
            setEntityToDelete(null);
        }
    };

    const DeleteConfirmationDialog: React.FC = () => (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete {entityToDelete?.name}. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );

    return {
        copiedId,
        copyEntityId,
        deleteEntity,
        DeleteConfirmationDialog,
    };
}