import { NDKEvent, NDKProject, useProfileValue, useSubscribe } from "@nostr-dev-kit/ndk-hooks";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { getEntityAvatar as getEntityAvatarUtil } from "../../lib/utils/ui-helpers";

interface Entity extends NDKEvent {
    id: string;
    name?: string;
    description?: string;
    pubkey?: string;
}

interface ProjectEntity<T extends Entity> {
    id: string;
    entity?: T;
}

interface ProjectEntitySettingsProps<T extends Entity> {
    project: NDKProject;
    editedProject: NDKProject;
    onProjectChanged: () => void;
    
    // Entity configuration
    entityType: string; // "agent" or "mcp"
    entityName: string; // "Agents" or "MCP Tools"
    entitySingular: string; // "agent" or "MCP tool"
    entityKind: number; // NDKAgent.kind or NDKMCPTool.kind
    emptyIcon: ReactNode;
    emptyMessage: string;
    emptyDescription: string;
    
    // Render functions
    renderSelector: (props: {
        selectedEntities: T[];
        onEntitiesChange: (entities: T[]) => void;
    }) => ReactNode;
    
    renderEntityDetails?: (entity: T) => ReactNode;
    getEntityAvatar?: (entity: T) => string;
    getEntityInitials?: (entity: T) => string;
}

export function ProjectEntitySettings<T extends Entity>({
    project,
    editedProject,
    onProjectChanged,
    entityType,
    entityName,
    entitySingular,
    entityKind,
    emptyIcon,
    emptyMessage,
    emptyDescription,
    renderSelector,
    renderEntityDetails,
    getEntityAvatar,
    getEntityInitials,
}: ProjectEntitySettingsProps<T>) {
    const [projectEntities, setProjectEntities] = useState<ProjectEntity<T>[]>([]);
    const [showSelector, setShowSelector] = useState(false);

    // Get entity IDs from project tags
    const entityIds = useMemo(() => {
        return project.tags
            .filter((tag) => tag[0] === entityType && tag[1])
            .map((tag) => tag[1] as string);
    }, [project.tags, entityType]);

    // Memoize the IDs key to prevent unnecessary re-subscriptions
    const entityIdsKey = useMemo(() => entityIds.join(","), [entityIds]);

    // Subscribe to entity events
    const { events: entityEvents } = useSubscribe<T>(
        entityIds.length > 0
            ? [
                  {
                      kinds: [entityKind],
                      ids: entityIds,
                  },
              ]
            : false,
        { wrap: true },
        [entityIdsKey]
    );

    // Update projectEntities when events are loaded
    useEffect(() => {
        const entities: ProjectEntity<T>[] = entityIds.map((id) => {
            const entity = entityEvents.find((e) => e.id === id);
            return { id, entity };
        });
        setProjectEntities(entities);
    }, [entityEvents, entityIds]);

    const handleAddEntities = (selectedEntities: T[]) => {
        const newEntities = selectedEntities.filter(
            (entity) => !projectEntities.some((pe) => pe.id === entity.id)
        );
        if (newEntities.length > 0) {
            const updatedEntities = [
                ...projectEntities,
                ...newEntities.map((entity) => ({ id: entity.id, entity })),
            ];
            setProjectEntities(updatedEntities);

            // Update the edited project
            editedProject.tags = editedProject.tags.filter((tag) => tag[0] !== entityType);
            for (const pe of updatedEntities) {
                editedProject.tags.push([entityType, pe.id]);
            }

            onProjectChanged();
        }
        setShowSelector(false);
    };

    const handleRemoveEntity = (entityId: string) => {
        const updatedEntities = projectEntities.filter((pe) => pe.id !== entityId);
        setProjectEntities(updatedEntities);

        // Update the edited project
        editedProject.tags = editedProject.tags.filter((tag) => tag[0] !== entityType);
        for (const pe of updatedEntities) {
            editedProject.tags.push([entityType, pe.id]);
        }

        onProjectChanged();
    };

    return (
        <div className="p-4 space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-semibold text-slate-900">{entityName}</h2>
                    <Button
                        onClick={() => setShowSelector(true)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add {entitySingular}
                    </Button>
                </div>
                <p className="text-sm text-slate-600">
                    Manage {entityName.toLowerCase()} assigned to work on this project
                </p>
            </div>

            {/* Entity List */}
            <div className="space-y-3">
                {projectEntities.length === 0 ? (
                    <div className="bg-white rounded-lg p-12 text-center">
                        <div className="w-12 h-12 text-slate-300 mx-auto mb-4">{emptyIcon}</div>
                        <p className="text-slate-600 mb-2">{emptyMessage}</p>
                        <p className="text-sm text-slate-500">{emptyDescription}</p>
                    </div>
                ) : (
                    projectEntities.map((pe) => (
                        <EntityCard
                            key={pe.id}
                            projectEntity={pe}
                            onRemove={() => handleRemoveEntity(pe.id)}
                            renderDetails={renderEntityDetails}
                            getAvatar={getEntityAvatar}
                            getInitials={getEntityInitials}
                        />
                    ))
                )}
            </div>

            {/* Selector Dialog */}
            <Dialog open={showSelector} onOpenChange={setShowSelector}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Select {entityName}</DialogTitle>
                    </DialogHeader>
                    {renderSelector({
                        selectedEntities: projectEntities
                            .map((pe) => pe.entity)
                            .filter(Boolean) as T[],
                        onEntitiesChange: handleAddEntities,
                    })}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function EntityCard<T extends Entity>({
    projectEntity,
    onRemove,
    renderDetails,
    getAvatar,
    getInitials,
}: {
    projectEntity: ProjectEntity<T>;
    onRemove: () => void;
    renderDetails?: (entity: T) => ReactNode;
    getAvatar?: (entity: T) => string;
    getInitials?: (entity: T) => string;
}) {
    const entity = projectEntity.entity;
    const authorProfile = useProfileValue(entity?.pubkey);

    if (!entity) {
        return (
            <div className="bg-white rounded-lg p-4 border border-slate-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-200 rounded-full animate-pulse" />
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-slate-200 rounded animate-pulse" />
                            <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="text-slate-400 hover:text-red-600"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        );
    }

    const avatarUrl = getAvatar
        ? getAvatar(entity)
        : getEntityAvatarUtil(entity.id, authorProfile?.image);

    const initials = getInitials
        ? getInitials(entity)
        : (entity.name || "Entity")
            .split(" ")
            .map((word) => word.charAt(0))
            .join("")
            .toUpperCase()
            .slice(0, 2);

    return (
        <div className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                        <AvatarImage src={avatarUrl} alt={entity.name} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-medium">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-medium text-slate-900">
                            {entity.name || "Unnamed"}
                        </h3>
                        {entity.description && (
                            <p className="text-sm text-slate-600 line-clamp-1">
                                {entity.description}
                            </p>
                        )}
                        {renderDetails && renderDetails(entity)}
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRemove}
                    className="text-slate-400 hover:text-red-600"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>
        </div>
    );
}