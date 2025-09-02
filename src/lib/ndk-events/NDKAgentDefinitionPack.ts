import { NDK, NDKEvent, NDKKind } from "@nostr-dev-kit/ndk";
import type { NostrEvent as NDKRawEvent } from "@nostr-dev-kit/ndk";

/**
 * NDKAgentDefinitionPack represents a collection/pack of agent definitions.
 * This class extends NDKEvent and uses event tags to reference agents that are part of the pack.
 * 
 * Event kind: 34199
 * 
 * Tags:
 * - e: Reference to agent events that are part of this pack
 * - title: Title of the pack
 * - image: Image URL for the pack
 * - content: Description of the pack
 */
export class NDKAgentDefinitionPack extends NDKEvent {
    static kind = 34199 as NDKKind;

    constructor(ndk?: NDK, event?: NDKEvent | NDKRawEvent) {
        super(ndk, event);
        this.kind = NDKAgentDefinitionPack.kind;
        
        // Ensure replaceable events have a d tag
        if (!this.dTag && !event) {
            // Generate a unique identifier for new packs
            this.dTag = Date.now().toString();
        }
    }

    /**
     * Factory method to create an NDKAgentDefinitionPack from an existing NDKEvent
     */
    static from(event: NDKEvent): NDKAgentDefinitionPack {
        return new NDKAgentDefinitionPack(event.ndk, event);
    }

    /**
     * Get the d tag (identifier) of the pack
     */
    get dTag(): string | undefined {
        return this.tagValue('d');
    }

    /**
     * Set the d tag (identifier) of the pack
     */
    set dTag(value: string | undefined) {
        this.removeTag('d');
        if (value !== undefined) {
            this.tags.push(['d', value]);
        }
    }

    /**
     * Get the title of the pack
     */
    get title(): string | undefined {
        return this.tagValue('title');
    }

    /**
     * Set the title of the pack
     */
    set title(value: string | undefined) {
        this.removeTag('title');
        if (value !== undefined) {
            this.tags.push(['title', value]);
        }
    }

    /**
     * Get the image URL of the pack
     */
    get image(): string | undefined {
        return this.tagValue('image');
    }

    /**
     * Set the image URL of the pack
     */
    set image(value: string | undefined) {
        this.removeTag('image');
        if (value !== undefined) {
            this.tags.push(['image', value]);
        }
    }

    /**
     * Get the description of the pack (stored in content)
     */
    get description(): string {
        return this.content;
    }

    /**
     * Set the description of the pack (stored in content)
     */
    set description(value: string) {
        this.content = value;
    }

    /**
     * Get all agent event IDs that are part of this pack
     */
    get agentEventIds(): string[] {
        return this.tags
            .filter(tag => tag[0] === 'e')
            .map(tag => tag[1])
            .filter(id => id !== undefined);
    }

    /**
     * Add an agent to the pack by event ID
     */
    addAgent(agentDefinition: NDKEvent): void {
        this.tag(agentDefinition);
    }

    /**
     * Remove an agent from the pack by event ID
     */
    removeAgent(agentDefinition: NDKEvent): void {
        this.tags = this.tags.filter(tag => !(tag[0] === 'e' && tag[1] === agentDefinition.id));
    }
}