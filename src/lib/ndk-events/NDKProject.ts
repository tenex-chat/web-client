import {
  NDKEvent,
  type NDKKind,
  type NostrEvent,
} from "@nostr-dev-kit/ndk-hooks";
import type NDK from "@nostr-dev-kit/ndk-hooks";
import { slugify } from "@/lib/utils/slugify";

export class NDKProject extends NDKEvent {
  static kind: NDKKind = 31933 as NDKKind;
  static kinds = [31933];

  constructor(ndk?: NDK, rawEvent?: NostrEvent) {
    super(ndk, rawEvent);
    this.kind = NDKProject.kind;
    if (!this.tags) {
      this.tags = [];
    }
    if (!this.content) {
      this.content = "";
    }
  }

  get title(): string {
    return this.tagValue("title") || this.tagValue("name") || "";
  }

  set title(value: string) {
    this.removeTag("title");
    this.removeTag("name");
    if (value) {
      this.tags.push(["title", value]);
    }
  }

  get description(): string {
    return this.content;
  }

  set description(value: string) {
    this.content = value;
  }

  get summary(): string {
    return this.description;
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

  get repoUrl(): string | undefined {
    return this.tagValue("repo");
  }

  set repoUrl(url: string | undefined) {
    this.removeTag("repo");
    if (url) {
      this.tags.push(["repo", url]);
    }
  }

  get hashtags(): string[] {
    return this.tags.filter((tag) => tag[0] === "t").map((tag) => tag[1]);
  }

  set hashtags(tags: string[]) {
    this.tags = this.tags.filter((tag) => tag[0] !== "t");
    tags.forEach((tag) => {
      this.tags.push(["t", tag]);
    });
  }

  addHashtag(tag: string) {
    this.tags.push(["t", tag]);
  }

  get agents(): Array<{ ndkAgentEventId: string }> {
    return this.tags
      .filter((tag) => tag[0] === "agent")
      .map((tag) => ({
        ndkAgentEventId: tag[1],
      }));
  }

  addAgent(eventId: string) {
    const tag = ["agent", eventId];
    this.tags.push(tag);
  }

  removeAgent(eventId: string) {
    this.tags = this.tags.filter(
      (tag) => !(tag[0] === "agent" && tag[1] === eventId),
    );
  }

  get mcpTools(): string[] {
    return this.tags.filter((tag) => tag[0] === "mcp").map((tag) => tag[1]);
  }

  addMCPTool(toolEventId: string) {
    this.tags.push(["mcp", toolEventId]);
  }

  get rules(): Array<{ id: string; agentNames: string[] }> {
    return this.tags
      .filter((tag) => tag[0] === "rule")
      .map((tag) => ({
        id: tag[1],
        agentNames: tag.slice(2),
      }));
  }

  addRule(id: string, agentNames: string[]) {
    const tag = ["rule", id, ...agentNames];
    this.tags.push(tag);
  }

  get template(): string | undefined {
    return this.tagValue("template");
  }

  set template(eventId: string | undefined) {
    this.removeTag("template");
    if (eventId) {
      this.tags.push(["template", eventId]);
    }
  }

  /**
   * Set the project ID from a NIP-33 tag reference
   * Format: kind:pubkey:d-tag
   */
  set projectId(value: string) {
    if (value.includes(":")) {
      // It's a NIP-33 reference
      this.tags.push(["a", value]);
    }
  }

  /**
   * Get the repository URL from tags
   */
  get repository(): string | undefined {
    return this.tagValue("repo");
  }

  /**
   * Set the repository URL in tags
   */
  set repository(url: string | undefined) {
    this.removeTag("repo");
    this.removeTag("repository");
    if (url) {
      this.tags.push(["repo", url]);
    }
  }

  /**
   * Get the d-tag for this project (NIP-33 replaceable event)
   */
  get dTag(): string | undefined {
    const existingDTag = this.tagValue("d");
    if (existingDTag) return existingDTag;

    // Generate from title if no d tag exists
    if (this.title) {
      return slugify(this.title);
    }

    return undefined;
  }

  /**
   * Generate a NIP-33 tag reference for this project
   * Format: kind:pubkey:d-tag
   */
  nip33TagReference(): string | undefined {
    if (!this.pubkey || !this.dTag) return undefined;
    return `${this.kind}:${this.pubkey}:${this.dTag}`;
  }

  /**
   * Generate the NIP-33 tag ID (same as nip33TagReference but following NDKEvent pattern)
   * Format: kind:pubkey:d-tag
   */
  override tagId(): string {
    return this.nip33TagReference() || "";
  }

  /**
   * Override delete method for replaceable events
   * For NIP-33 replaceable events, we:
   * 1. Publish a deletion event (kind 5) for compatibility
   * 2. Republish the replaceable event with a ["deleted"] tag
   */
  async delete(reason?: string, publish = true): Promise<NDKEvent> {
    if (!this.ndk) throw new Error("No NDK instance found");

    this.ndk.assertSigner();

    // First, create and publish the deletion event (kind 5) using parent method
    const deletionEvent = await super.delete(reason, publish);

    // Then, add "deleted" tag to the replaceable event and republish it
    this.removeTag("deleted");
    this.tags.push(["deleted"]);

    // Update timestamp to ensure this replaces the previous version
    this.created_at = Math.floor(Date.now() / 1000);

    if (publish) {
      await this.publish();
    }

    return deletionEvent;
  }

  /**
   * Create an NDKProject from an existing event
   */
  static from(event: NDKEvent): NDKProject {
    const rawEvent = event.rawEvent() as NostrEvent & { created_at: number };
    return new NDKProject(event.ndk, rawEvent);
  }
}
