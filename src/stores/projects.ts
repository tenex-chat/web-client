import { create } from "zustand";
import { NDKProject } from "../lib/ndk-events/NDKProject";
import { NDKProjectStatus, type ProjectAgent, type ProjectModel, type ExecutionQueue } from "../lib/ndk-events/NDKProjectStatus";
import type { NDKEvent, NDKSubscription } from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk";
import { useAgentsStore } from "./agents";
import { useProjectActivityStore } from "./projectActivity";

interface ProjectStatusData {
    statusEvent: NDKProjectStatus | null;
    agents: ProjectAgent[];
    models: ProjectModel[];
    executionQueue: ExecutionQueue | null;
    lastSeen: Date | null;
    isOnline: boolean;
}

interface ProjectsState {
    // Map of dTag -> NDKProject
    projects: Map<string, NDKProject>;
    // Map of bech32 -> dTag for quick lookup
    bech32Map: Map<string, string>;
    // Map of tagId -> dTag for legacy compatibility
    tagIdMap: Map<string, string>;
    projectsArray: NDKProject[]; // Cached array version
    projectsWithStatusArray: Array<{ project: NDKProject; status: ProjectStatusData | null }>; // Cached combined array
    threads: Map<string, NDKEvent[]>;
    // Map of dTag -> project status data
    projectStatus: Map<string, ProjectStatusData>;
    // Single subscription for all project status events
    statusSubscription: NDKSubscription | null;
    // Subscription for projects
    projectsSubscription: NDKSubscription | null;
    
    addProject: (project: NDKProject) => void;
    removeProject: (dTag: string) => void;
    setProjects: (projects: NDKProject[]) => void;
    addThread: (dTag: string, thread: NDKEvent) => void;
    setThreads: (dTag: string, threads: NDKEvent[]) => void;
    
    // Lookup methods
    getProjectByDTag: (dTag: string) => NDKProject | null;
    getProjectByBech32: (bech32: string) => NDKProject | null;
    getProjectByTagId: (tagId: string) => NDKProject | null;
    getProjectByIdentifier: (identifier: string) => NDKProject | null;
    
    // Subscription management
    initializeSubscriptions: (ndk: NDK, userPubkey: string) => void;
    cleanupSubscriptions: () => void;
    
    // Status management
    initializeStatusSubscription: (ndk: NDK) => void;
    updateProjectStatus: (event: NDKEvent) => void;
    cleanupStatusSubscription: () => void;
    getProjectStatus: (dTag: string) => ProjectStatusData | null;
}

// Initial empty array that's stable
const INITIAL_PROJECTS_WITH_STATUS: Array<{ project: NDKProject; status: ProjectStatusData | null }> = [];
const INITIAL_PROJECTS_ARRAY: NDKProject[] = [];

export const useProjectsStore = create<ProjectsState>((set, get) => ({
        projects: new Map(),
        bech32Map: new Map(),
        tagIdMap: new Map(),
        projectsArray: INITIAL_PROJECTS_ARRAY,
        projectsWithStatusArray: INITIAL_PROJECTS_WITH_STATUS,
        threads: new Map(),
        projectStatus: new Map(),
        statusSubscription: null,
        projectsSubscription: null,
        
        addProject: (project) => set((state) => {
            console.log('addProject', project.dTag)
            // Don't add deleted projects
            if (project.hasTag('deleted')) {
                return state;
            }
            const dTag = project.dTag;
            if (!dTag) {
                console.warn('[ProjectStore] Project missing dTag, skipping');
                return state;
            }
            
            const newProjects = new Map(state.projects);
            const newBech32Map = new Map(state.bech32Map);
            const newTagIdMap = new Map(state.tagIdMap);
            
            newProjects.set(dTag, project);
            
            // Add bech32 mapping
            try {
                const bech32 = project.encode();
                if (bech32) {
                    newBech32Map.set(bech32, dTag);
                }
            } catch (e) {
                console.warn('[ProjectStore] Failed to encode project to bech32', e);
            }
            
            // Add tagId mapping for legacy compatibility
            const tagId = project.tagId();
            if (tagId) {
                newTagIdMap.set(tagId, dTag);
            }
            
            const newProjectsArray = Array.from(newProjects.values());
            return { 
                projects: newProjects,
                bech32Map: newBech32Map,
                tagIdMap: newTagIdMap,
                projectsArray: newProjectsArray,
                projectsWithStatusArray: newProjectsArray.map(p => ({
                    project: p,
                    status: state.projectStatus.get(p.dTag || '') || null
                }))
            };
        }),
        
        removeProject: (dTag) => set((state) => {
            const project = state.projects.get(dTag);
            if (!project) return state;
            
            const newProjects = new Map(state.projects);
            const newBech32Map = new Map(state.bech32Map);
            const newTagIdMap = new Map(state.tagIdMap);
            
            newProjects.delete(dTag);
            
            // Remove from bech32 map
            try {
                const bech32 = project.encode();
                if (bech32) {
                    newBech32Map.delete(bech32);
                }
            } catch (e) {
                // Ignore encoding errors
            }
            
            // Remove from tagId map
            const tagId = project.tagId();
            if (tagId) {
                newTagIdMap.delete(tagId);
            }
            
            // Also remove status for this project
            const newStatus = new Map(state.projectStatus);
            newStatus.delete(dTag);
            const newProjectsArray = Array.from(newProjects.values());
            return { 
                projects: newProjects,
                bech32Map: newBech32Map,
                tagIdMap: newTagIdMap,
                projectsArray: newProjectsArray,
                projectStatus: newStatus,
                projectsWithStatusArray: newProjectsArray.map(p => ({
                    project: p,
                    status: newStatus.get(p.dTag || '') || null
                }))
            };
        }),
        
        setProjects: (projects) => set((state) => {
            console.log('[setProjects] Called with', projects.length, 'projects');
            const newProjects = new Map();
            const newBech32Map = new Map();
            const newTagIdMap = new Map();
            
            projects.forEach(project => {
                // Filter out deleted projects
                if (!project.hasTag('deleted')) {
                    const dTag = project.dTag;
                    if (!dTag) {
                        console.warn('[ProjectStore] Project missing dTag, skipping');
                        return;
                    }
                    
                    newProjects.set(dTag, project);
                    
                    // Add bech32 mapping
                    try {
                        const bech32 = project.encode();
                        if (bech32) {
                            newBech32Map.set(bech32, dTag);
                        }
                    } catch (e) {
                        console.warn('[ProjectStore] Failed to encode project to bech32', e);
                    }
                    
                    // Add tagId mapping for legacy compatibility
                    const tagId = project.tagId();
                    if (tagId) {
                        newTagIdMap.set(tagId, dTag);
                    }
                }
            });
            const newProjectsArray = Array.from(newProjects.values());
            console.log('[setProjects] Returning', newProjectsArray.length, 'projects after filtering');
            
            // Check if projects actually changed
            if (newProjectsArray.length === 0 && state.projectsArray.length === 0) {
                console.log('[setProjects] No changes detected, returning existing state');
                return state;
            }
            
            const projectsChanged = newProjectsArray.length !== state.projectsArray.length ||
                newProjectsArray.some((p, i) => p.dTag !== state.projectsArray[i]?.dTag);
            
            // Only update arrays if projects actually changed
            if (!projectsChanged) {
                console.log('[setProjects] No changes detected, returning existing state');
                return state;
            }
            
            console.log('[setProjects] Projects changed, updating state')
            
            // Create new arrays
            const newProjectsWithStatusArray = newProjectsArray.map(p => ({
                project: p,
                status: state.projectStatus.get(p.dTag || '') || null
            }));
            
            return { 
                projects: newProjects,
                bech32Map: newBech32Map,
                tagIdMap: newTagIdMap,
                projectsArray: newProjectsArray,
                projectsWithStatusArray: newProjectsWithStatusArray
            };
        }),
        
        addThread: (dTag, thread) => set((state) => {
            const projectThreads = state.threads.get(dTag) || [];
            const newThreads = new Map(state.threads);
            newThreads.set(dTag, [...projectThreads, thread]);
            return { threads: newThreads };
        }),
        
        setThreads: (dTag, threads) => set((state) => {
            const newThreads = new Map(state.threads);
            newThreads.set(dTag, threads);
            return { threads: newThreads };
        }),
        
        // Lookup methods
        getProjectByDTag: (dTag: string) => {
            return get().projects.get(dTag) || null;
        },
        
        getProjectByBech32: (bech32: string) => {
            const dTag = get().bech32Map.get(bech32);
            if (!dTag) return null;
            return get().projects.get(dTag) || null;
        },
        
        getProjectByTagId: (tagId: string) => {
            const dTag = get().tagIdMap.get(tagId);
            if (!dTag) return null;
            return get().projects.get(dTag) || null;
        },
        
        getProjectByIdentifier: (identifier: string) => {
            // Try direct dTag lookup first
            let project = get().projects.get(identifier);
            if (project) return project;
            
            // Try bech32 lookup
            const bech32Project = get().getProjectByBech32(identifier);
            if (bech32Project) return bech32Project;
            
            // Try tagId lookup for legacy compatibility
            const tagIdProject = get().getProjectByTagId(identifier);
            if (tagIdProject) return tagIdProject;
            
            return null;
        },
        
        // Initialize global status subscription for all projects
        initializeStatusSubscription: (ndk: NDK) => {
            const { statusSubscription } = get();
            
            // Don't re-initialize if already subscribed
            if (statusSubscription) {
                return;
            }
            
            // Get the current user's pubkey
            const user = ndk.signer?.user();
            if (!user) {
                return;
            }
            
            user.then((userInfo) => {
                if (!userInfo) {
                    return;
                }
                
                const filter = {
                    kinds: [24010], // PROJECT_STATUS event kind
                    "#p": [userInfo.pubkey] // Status events for the current user's projects
                };
                
                // Subscribe to all project status events for this user
                const sub = ndk.subscribe(
                    filter,
                    { closeOnEose: false, groupable: true, subId: 'status' },
                    {
                        onEvent: (event: NDKEvent) => get().updateProjectStatus(event),
                    }
                );
                
                set({ statusSubscription: sub });
            });
        },
        
        
        updateProjectStatus: (event: NDKEvent) => {
            if (!event.ndk) return;

            const { projects, tagIdMap, projectStatus } = get();
            const status = new NDKProjectStatus(event.ndk, event);
            const projectTagId = status.projectId;
            
            if (!projectTagId) {
                return;
            }
            
            // Convert tagId to dTag
            let finalDTag = tagIdMap.get(projectTagId);
            if (!finalDTag) {
                // Try direct lookup in case it's already a dTag
                if (projects.has(projectTagId)) {
                    finalDTag = projectTagId;
                } else {
                    return;
                }
            }
            
            // Only process status events for projects we know about
            if (!projects.has(finalDTag)) {
                return;
            }
            
            // Check for global agents and add them to the agents store
            for (const tag of event.tags) {
                if (tag[0] === 'agent') {
                    if (tag.length >= 4) {
                        if (tag[3] === 'global') {
                            useAgentsStore.getState().addGlobalAgent(tag[1], tag[2]);
                        }
                    }
                }
            }
            
            // Check if this is actually a change
            const existingStatus = projectStatus.get(finalDTag);
            if (existingStatus && 
                existingStatus.isOnline === status.isOnline &&
                existingStatus.agents.length === status.agents.length &&
                existingStatus.models.length === status.models.length) {
                // No change, skip update to prevent re-renders
                return;
            }
            
            // Update activity timestamp when we receive a status update
            // Use the event's created_at timestamp for consistency
            if (status.isOnline || status.lastSeen) {
                // If online, use current event time; if has lastSeen, use the most recent
                const timestamp = status.isOnline ? event.created_at : 
                                 (status.lastSeen ? Math.floor(status.lastSeen.getTime() / 1000) : null);
                if (timestamp) {
                    useProjectActivityStore.getState().updateActivity(finalDTag, timestamp);
                }
            }
            
            const project = projects.get(finalDTag);
            console.log(`[ProjectStore] Status update for ${project?.title || finalDTag}: ${status.isOnline ? 'online' : 'offline'} (${status.agents.length} agents, ${status.models.length} models)`);
            
            set((state) => {
                const newStatus = new Map(state.projectStatus);
                newStatus.set(finalDTag, {
                    statusEvent: status,
                    agents: status.agents,
                    models: status.models,
                    executionQueue: status.executionQueue,
                    lastSeen: status.lastSeen || null,
                    isOnline: status.isOnline
                });
                
                // Update the cached combined array
                const newProjectsWithStatusArray = state.projectsArray.map(p => ({
                    project: p,
                    status: newStatus.get(p.dTag || '') || null
                }));
                
                return { 
                    projectStatus: newStatus,
                    projectsWithStatusArray: newProjectsWithStatusArray
                };
            });
        },
        
        // Initialize all subscriptions when user logs in
        initializeSubscriptions: (ndk: NDK, userPubkey: string) => {
            console.log("called initializeSubscriptions");
            const { projectsSubscription, statusSubscription } = get();
            
            // Clean up any existing subscriptions first
            if (projectsSubscription || statusSubscription) {
                get().cleanupSubscriptions();
            }
            
            // Clear projects first to ensure clean state
            set({ 
                projects: new Map(),
                projectsArray: INITIAL_PROJECTS_ARRAY,
                projectsWithStatusArray: INITIAL_PROJECTS_WITH_STATUS
            });
            
            // Subscribe to user's projects
            const projectsSub = ndk.subscribe({
                kinds: [31933],
                authors: [userPubkey],
            }, { closeOnEose: false }, {
                onEvent: (event: NDKEvent) => {
                    console.log('received event', event.dTag)
                    const project = new NDKProject(ndk, event.rawEvent());
                    const projectDTag = project.dTag;

                    if (!projectDTag) {
                        throw "No projectDTag";
                    }
                    
                    if (project.hasTag('deleted')) {
                        get().removeProject(projectDTag);
                    } else {
                        get().addProject(project);
                    }
                },
                onEose: () => {
                    // Initialize status subscription after initial projects have loaded
                    get().initializeStatusSubscription(ndk);
                }
            });
            
            set({ projectsSubscription: projectsSub });
        },
        
        // Clean up all subscriptions when user logs out
        cleanupSubscriptions: () => {
            const { projectsSubscription, statusSubscription } = get();
            
            if (projectsSubscription) {
                console.log('[ProjectStore] Cleaning up projects subscription');
                projectsSubscription.stop();
            }
            
            if (statusSubscription) {
                console.log('[ProjectStore] Cleaning up status subscription');
                statusSubscription.stop();
            }
            
            set({
                projectsSubscription: null,
                statusSubscription: null,
                projects: new Map(),
                projectsArray: INITIAL_PROJECTS_ARRAY,
                projectStatus: new Map(),
                projectsWithStatusArray: INITIAL_PROJECTS_WITH_STATUS
            });
        },
        
        cleanupStatusSubscription: () => {
            const { statusSubscription } = get();
            
            if (statusSubscription) {
                console.log('[ProjectStore] Cleaning up status subscription');
                statusSubscription.stop();
            }
            
            set((state) => ({
                statusSubscription: null,
                projectStatus: new Map(),
                projectsWithStatusArray: state.projectsArray.map(p => ({
                    project: p,
                    status: null
                }))
            }));
        },
        
        getProjectStatus: (dTag: string) => {
            return get().projectStatus.get(dTag) || null;
        }
    })
);

// Selector hooks for easy access
export const useProjectStatus = (dTag: string | undefined) => {
    return useProjectsStore(state => 
        dTag ? state.projectStatus.get(dTag) || null : null
    );
};

// Separate selectors to prevent unnecessary re-renders
// Return the cached array of projects
export const useProjectsArray = () => {
    return useProjectsStore(state => state.projectsArray);
};

// Direct access to the store maps (use carefully)
export const useProjectsMap = () => {
    return useProjectsStore(state => state.projects);
};

export const useProjectStatusMap = () => {
    return useProjectsStore(state => state.projectStatus);
};

// Combined selector that returns projects with their status
// Returns the cached array to prevent unnecessary re-renders
export const useProjectsWithStatus = () => {
    return useProjectsStore(state => state.projectsWithStatusArray);
};

