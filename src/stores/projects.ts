import { create } from "zustand";
import { NDKProject } from "../lib/ndk-events/NDKProject";
import { NDKProjectStatus, type ProjectAgent, type ProjectModel } from "../lib/ndk-events/NDKProjectStatus";
import type { NDKEvent, NDKSubscription, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk";
import { useAgentsStore } from "./agents";
import { useProjectActivityStore } from "./projectActivity";

interface ProjectStatusData {
    statusEvent: NDKProjectStatus | null;
    agents: ProjectAgent[];
    models: ProjectModel[];
    lastSeen: Date | null;
    isOnline: boolean;
}

interface ProjectsState {
    projects: Map<string, NDKProject>;
    projectsArray: NDKProject[]; // Cached array version
    projectsWithStatusArray: Array<{ project: NDKProject; status: ProjectStatusData | null }>; // Cached combined array
    threads: Map<string, NDKEvent[]>;
    // Map of projectTagId -> project status data
    projectStatus: Map<string, ProjectStatusData>;
    // Single subscription for all project status events
    statusSubscription: NDKSubscription | null;
    // Subscription for projects
    projectsSubscription: NDKSubscription | null;
    
    addProject: (project: NDKProject) => void;
    removeProject: (projectId: string) => void;
    setProjects: (projects: NDKProject[]) => void;
    addThread: (projectId: string, thread: NDKEvent) => void;
    setThreads: (projectId: string, threads: NDKEvent[]) => void;
    
    // Subscription management
    initializeSubscriptions: (ndk: NDK, userPubkey: string) => void;
    cleanupSubscriptions: () => void;
    
    // Status management
    initializeStatusSubscription: (ndk: NDK) => void;
    updateProjectStatus: (event: NDKEvent) => void;
    cleanupStatusSubscription: () => void;
    getProjectStatus: (projectTagId: string) => ProjectStatusData | null;
}

// Initial empty array that's stable
const INITIAL_PROJECTS_WITH_STATUS: Array<{ project: NDKProject; status: ProjectStatusData | null }> = [];
const INITIAL_PROJECTS_ARRAY: NDKProject[] = [];

export const useProjectsStore = create<ProjectsState>((set, get) => ({
        projects: new Map(),
        projectsArray: INITIAL_PROJECTS_ARRAY,
        projectsWithStatusArray: INITIAL_PROJECTS_WITH_STATUS,
        threads: new Map(),
        projectStatus: new Map(),
        statusSubscription: null,
        projectsSubscription: null,
        
        addProject: (project) => set((state) => {
            // Don't add deleted projects
            if (project.hasTag('deleted')) {
                return state;
            }
            const newProjects = new Map(state.projects);
            newProjects.set(project.tagId(), project);
            const newProjectsArray = Array.from(newProjects.values());
            return { 
                projects: newProjects,
                projectsArray: newProjectsArray,
                projectsWithStatusArray: newProjectsArray.map(p => ({
                    project: p,
                    status: state.projectStatus.get(p.tagId()) || null
                }))
            };
        }),
        
        removeProject: (projectId) => set((state) => {
            const newProjects = new Map(state.projects);
            newProjects.delete(projectId);
            // Also remove status for this project
            const newStatus = new Map(state.projectStatus);
            newStatus.delete(projectId);
            const newProjectsArray = Array.from(newProjects.values());
            return { 
                projects: newProjects, 
                projectsArray: newProjectsArray,
                projectStatus: newStatus,
                projectsWithStatusArray: newProjectsArray.map(p => ({
                    project: p,
                    status: newStatus.get(p.tagId()) || null
                }))
            };
        }),
        
        setProjects: (projects) => set((state) => {
            console.log('[setProjects] Called with', projects.length, 'projects');
            const newProjects = new Map();
            projects.forEach(project => {
                // Filter out deleted projects
                if (!project.hasTag('deleted')) {
                    newProjects.set(project.tagId(), project);
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
                newProjectsArray.some((p, i) => p.tagId() !== state.projectsArray[i]?.tagId());
            
            // Only update arrays if projects actually changed
            if (!projectsChanged) {
                console.log('[setProjects] No changes detected, returning existing state');
                return state;
            }
            
            console.log('[setProjects] Projects changed, updating state')
            
            // Create new arrays
            const newProjectsWithStatusArray = newProjectsArray.map(p => ({
                project: p,
                status: state.projectStatus.get(p.tagId()) || null
            }));
            
            return { 
                projects: newProjects,
                projectsArray: newProjectsArray,
                projectsWithStatusArray: newProjectsWithStatusArray
            };
        }),
        
        addThread: (projectId, thread) => set((state) => {
            const projectThreads = state.threads.get(projectId) || [];
            const newThreads = new Map(state.threads);
            newThreads.set(projectId, [...projectThreads, thread]);
            return { threads: newThreads };
        }),
        
        setThreads: (projectId, threads) => set((state) => {
            const newThreads = new Map(state.threads);
            newThreads.set(projectId, threads);
            return { threads: newThreads };
        }),
        
        // Initialize global status subscription for all projects
        initializeStatusSubscription: (ndk: NDK) => {
            console.log('[ProjectStore] initializeStatusSubscription called with ndk:', !!ndk);
            const { statusSubscription } = get();
            
            // Don't re-initialize if already subscribed
            if (statusSubscription) {
                console.log('[ProjectStore] Status subscription already exists, skipping initialization');
                return;
            }
            
            // Get the current user's pubkey
            const user = ndk.signer?.user();
            if (!user) {
                console.log('[ProjectStore] No user found, cannot initialize status subscription');
                return;
            }
            
            user.then((userInfo) => {
                if (!userInfo) {
                    console.log('[ProjectStore] No user info found');
                    return;
                }
                
                const filter = {
                    kinds: [24010], // PROJECT_STATUS event kind
                    "#p": [userInfo.pubkey] // Status events for the current user's projects
                };
                console.log('[ProjectStore] Creating subscription with filter:', filter);
                
                // Subscribe to all project status events for this user
                const sub = ndk.subscribe(
                    filter,
                    { closeOnEose: false, groupable: true, subId: 'status' }
                );
                
                console.log('[ProjectStore] Subscription created:', !!sub);
                
                sub.on('event', (event: NDKEvent) => {
                    get().updateProjectStatus(event);
                });
                
                sub.on('eose', () => {
                    console.log('[ProjectStore] End of stored events reached');
                    // After getting status events, fetch global agents
                });
                
                set({ statusSubscription: sub });
                console.log('[ProjectStore] Status subscription initialized');
            });
        },
        
        
        updateProjectStatus: (event: NDKEvent) => {
            const { projects, projectStatus } = get();
            const status = new NDKProjectStatus(event.ndk!, event.rawEvent());
            const projectId = status.projectId;
            
            if (!projectId) {
                return;
            }
            
            // Only process status events for projects we know about
            if (!projects.has(projectId)) {
                return;
            }
            
            // Check for global agents and add them to the agents store
            for (const tag of event.tags) {
                if (tag[0] === 'agent') {
                    if (tag.length >= 4) {
                        if (tag[3] === 'global') {
                            console.log(`[ProjectStore] 🌍 GLOBAL AGENT DETECTED! pubkey: ${tag[1]}, slug: ${tag[2]}`);
                            useAgentsStore.getState().addGlobalAgent(tag[1], tag[2]);
                        }
                    }
                }
            }
            
            // Check if this is actually a change
            const existingStatus = projectStatus.get(projectId);
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
                    useProjectActivityStore.getState().updateActivity(projectId, timestamp);
                }
            }
            
            const project = projects.get(projectId);
            console.log(`[ProjectStore] Status update for ${project?.title || projectId}: ${status.isOnline ? 'online' : 'offline'} (${status.agents.length} agents, ${status.models.length} models)`);
            
            set((state) => {
                const newStatus = new Map(state.projectStatus);
                newStatus.set(projectId, {
                    statusEvent: status,
                    agents: status.agents,
                    models: status.models,
                    lastSeen: status.lastSeen || null,
                    isOnline: status.isOnline
                });
                
                // Update the cached combined array
                const newProjectsWithStatusArray = state.projectsArray.map(p => ({
                    project: p,
                    status: newStatus.get(p.tagId()) || null
                }));
                
                return { 
                    projectStatus: newStatus,
                    projectsWithStatusArray: newProjectsWithStatusArray
                };
            });
        },
        
        // Initialize all subscriptions when user logs in
        initializeSubscriptions: (ndk: NDK, userPubkey: string) => {
            console.log('[ProjectStore] Initializing subscriptions for user:', userPubkey);
            const { projectsSubscription, statusSubscription } = get();
            
            // Clean up any existing subscriptions first
            if (projectsSubscription || statusSubscription) {
                console.log('[ProjectStore] Cleaning up existing subscriptions');
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
                    const project = new NDKProject(ndk, event.rawEvent());
                    const projectTagId = project.tagId();
                    
                    if (project.hasTag('deleted')) {
                        get().removeProject(projectTagId);
                    } else {
                        get().addProject(project);
                    }
                },
                onEose: () => {
                    console.log('[ProjectStore] End of stored events for projects');
                    // Initialize status subscription after initial projects have loaded
                    console.log('[ProjectStore] Initializing status subscription');
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
        
        getProjectStatus: (projectTagId: string) => {
            return get().projectStatus.get(projectTagId) || null;
        }
    })
);

// Selector hooks for easy access
export const useProjectStatus = (projectTagId: string | undefined) => {
    return useProjectsStore(state => 
        projectTagId ? state.projectStatus.get(projectTagId) || null : null
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

