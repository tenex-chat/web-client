import type { NDKProject } from "@/lib/ndk-events/NDKProject";

export function filterAgentTags(tags: string[][]): string[][] {
  return tags.filter((tag) => tag[0] === "agent");
}

export function filterNonAgentTags(tags: string[][]): string[][] {
  return tags.filter((tag) => tag[0] !== "agent");
}

export async function publishProjectManagerUpdate(
  project: NDKProject,
  selectedPM: string,
): Promise<void> {
  const agentTags = filterAgentTags(project.tags);

  const newPMTagIndex = agentTags.findIndex(
    (tag) => tag[2] === selectedPM || tag[1] === selectedPM,
  );

  if (newPMTagIndex === -1) {
    throw new Error("Selected Project Manager not found in agent tags");
  }

  const newPMTag = agentTags[newPMTagIndex];
  const otherAgentTags = agentTags.filter((_, index) => index !== newPMTagIndex);
  const reorderedAgentTags = [newPMTag, ...otherAgentTags];

  const nonAgentTags = filterNonAgentTags(project.tags);
  const newTags = [...nonAgentTags, ...reorderedAgentTags];

  project.tags = newTags;
  await project.publishReplaceable();
}

export async function publishAgentVersionUpdate(
  project: NDKProject,
  oldEventId: string,
  newEventId: string,
): Promise<void> {
  const newTags = project.tags.map((tag) => {
    if (tag[0] === "agent" && tag[1] === oldEventId) {
      return ["agent", newEventId];
    }
    return tag;
  });

  project.tags = newTags;
  await project.publishReplaceable();
}

export async function publishAgentRemoval(
  project: NDKProject,
  agentEventIdToRemove: string,
): Promise<void> {
  const newTags = project.tags.filter((tag) => {
    if (tag[0] !== "agent") return true;
    return tag[1] !== agentEventIdToRemove;
  });

  project.tags = newTags;
  await project.publishReplaceable();
}