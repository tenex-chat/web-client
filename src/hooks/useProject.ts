import { useProjectsStore } from "@/stores/projects";

/**
 * Custom hook to get an NDKProject by its identifier from the store
 * Supports dTag, bech32, or legacy tagId lookups
 * @param identifier - The dTag, bech32, or tagId of the project to get from the store
 * @returns The project from the store or null if not found
 */
export function useProject(identifier: string | undefined) {
  return useProjectsStore((state) =>
    identifier ? state.getProjectByIdentifier(identifier) : null,
  );
}
