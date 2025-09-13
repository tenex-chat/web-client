import { useProjectsStore } from "@/stores/projects";

export interface UserStatus {
  isExternal: boolean;
  projectName?: string;
}

/**
 * Determines if a user is external to the current project and which project they belong to
 * @param userPubkey - The pubkey to check
 * @param currentUserPubkey - The current logged-in user's pubkey
 * @param currentProjectDTag - The current project's dTag
 * @returns UserStatus with external flag and optional project name
 */
export function getUserStatus(
  userPubkey: string | undefined,
  currentUserPubkey: string | undefined,
  currentProjectDTag: string | undefined,
): UserStatus {
  if (!userPubkey || !currentProjectDTag) {
    return { isExternal: false };
  }

  // Check if it's the current user
  if (userPubkey === currentUserPubkey) {
    return { isExternal: false };
  }

  // Get all project statuses from the store
  const projectStatusMap = useProjectsStore.getState().projectStatus;
  const projectsMap = useProjectsStore.getState().projects;

  // Check if user is an agent in the current project
  const currentProjectStatus = projectStatusMap.get(currentProjectDTag);
  if (
    currentProjectStatus?.agents.some((agent) => agent.pubkey === userPubkey)
  ) {
    return { isExternal: false };
  }

  // Check if user belongs to other projects
  for (const [dTag, status] of projectStatusMap.entries()) {
    if (
      dTag !== currentProjectDTag &&
      status.agents.some((agent) => agent.pubkey === userPubkey)
    ) {
      const project = projectsMap.get(dTag);
      if (project) {
        return {
          isExternal: true,
          projectName: project.title || dTag,
        };
      }
    }
  }

  // User is external but not associated with any known project
  return { isExternal: true };
}
