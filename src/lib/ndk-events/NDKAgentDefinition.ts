import {
  NDKEvent,
  type NDKKind,
  type NostrEvent,
} from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk-hooks";
import { slugify } from "@/lib/utils/slugify";

export class NDKAgentDefinition extends NDKEvent {
  static kind: NDKKind = 4199 as NDKKind;
  static kinds = [4199];

  constructor(ndk?: NDK, rawEvent?: NostrEvent) {
    super(ndk, rawEvent);
    this.kind ??= NDKAgentDefinition.kind;
  }

  static from(event: NDKEvent) {
    return new NDKAgentDefinition(event.ndk, event.rawEvent());
  }

  get name(): string {
    return this.tagValue("title") || "";
  }

  set name(value: string) {
    this.removeTag("title");
    if (value) {
      this.tags.push(["title", value]);
    }
  }

  get description(): string {
    return this.tagValue("description") || this.content || "";
  }

  set description(value: string) {
    this.removeTag("description");
    this.content = value;
    if (value) {
      this.tags.push(["description", value]);
    }
  }

  get role(): string {
    return this.tagValue("role") || "assistant";
  }

  set role(value: string) {
    this.removeTag("role");
    if (value) {
      this.tags.push(["role", value]);
    }
  }

  get instructions(): string {
    return this.content;
  }

  set instructions(value: string) {
    this.content = value;
  }

  get useCriteria(): string[] {
    return this.tags
      .filter((tag) => tag[0] === "use-criteria")
      .map((tag) => tag[1]);
  }

  set useCriteria(criteria: string[]) {
    this.tags = this.tags.filter((tag) => tag[0] !== "use-criteria");
    criteria.forEach((criterion) => {
      this.tags.push(["use-criteria", criterion]);
    });
  }

  get model(): string | undefined {
    return this.tagValue("model");
  }

  set model(value: string | undefined) {
    this.removeTag("model");
    if (value) {
      this.tags.push(["model", value]);
    }
  }

  get picture(): string | undefined {
    return this.tagValue("picture") || this.tagValue("image");
  }

  set picture(url: string | undefined) {
    this.removeTag("picture");
    this.removeTag("image");
    if (url) {
      this.tags.push(["picture", url]);
    }
  }

  get version(): string | undefined {
    return this.tagValue("version");
  }

  set version(value: string | undefined) {
    this.removeTag("version");
    if (value) {
      this.tags.push(["version", value]);
    }
  }

  get slug(): string | undefined {
    return this.dTag;
  }

  set slug(value: string | undefined) {
    this.removeTag("d");
    if (value) {
      this.tags.push(["d", value]);
    }
  }

  get dTag(): string | undefined {
    const existingDTag = this.tagValue("d");
    if (existingDTag) return existingDTag;

    // Generate from name if no d tag exists
    if (this.name) {
      return slugify(this.name);
    }

    return undefined;
  }

  get tools(): string[] {
    return this.tags
      .filter((tag) => tag[0] === "tool" && tag[1])
      .map((tag) => tag[1]);
  }

  set tools(toolNames: string[]) {
    // Remove existing tool tags
    this.tags = this.tags.filter((tag) => tag[0] !== "tool");
    // Add new tool tags
    toolNames.forEach((tool) => {
      if (tool) {
        this.tags.push(["tool", tool]);
      }
    });
  }

  get mcpServers(): string[] {
    return this.tags
      .filter((tag) => tag[0] === "mcp" && tag[1])
      .map((tag) => tag[1]);
  }

  set mcpServers(mcpEventIds: string[]) {
    // Remove existing mcp tags
    this.tags = this.tags.filter((tag) => tag[0] !== "mcp");
    // Add new mcp tags
    mcpEventIds.forEach((eventId) => {
      if (eventId) {
        this.tags.push(["mcp", eventId]);
      }
    });
  }

  get phases(): Array<{ name: string; instructions: string }> {
    return this.tags
      .filter((tag) => tag[0] === "phase" && tag[1] && tag[2])
      .map((tag) => ({ name: tag[1], instructions: tag[2] }));
  }

  set phases(phases: Array<{ name: string; instructions: string }>) {
    // Remove existing phase tags
    this.tags = this.tags.filter((tag) => tag[0] !== "phase");
    // Add new phase tags
    phases.forEach((phase) => {
      if (phase.name && phase.instructions) {
        this.tags.push(["phase", phase.name, phase.instructions]);
      }
    });
  }
}
