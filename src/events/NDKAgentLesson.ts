import { NDKEvent, type NDKRawEvent } from "@nostr-dev-kit/ndk";
import type NDK from "@nostr-dev-kit/ndk";

export class NDKAgentLesson extends NDKEvent {
    static kind = 4129;
    static kinds = [4129];

    constructor(ndk?: NDK, event?: NDKEvent | NDKRawEvent) {
        super(ndk, event);
        this.kind ??= 4129;
    }

    static from(event: NDKEvent): NDKAgentLesson {
        return new NDKAgentLesson(event.ndk, event);
    }

    get title(): string | undefined {
        return this.tagValue("title");
    }

    /**
     * Title/description of what this lesson is about.
     */
    set title(value: string | undefined) {
        this.removeTag("title");
        if (value) this.tags.push(["title", value]);
    }

    /**
     * The lesson content - what the agent learned.
     * This is stored in the event content.
     */
    get lesson(): string {
        return this.content;
    }

    set lesson(value: string) {
        this.content = value;
    }

    /**
     * Set the agent that this lesson belongs to.
     * @param agentEvent The NDKAgent event to reference
     */
    set agent(agentEvent: NDKEvent) {
        this.removeTag("e");
        this.tag(agentEvent);
    }

    /**
     * Get the agent event ID this lesson belongs to.
     */
    get agentId(): string | undefined {
        return this.tags.find((tag) => tag[0] === "e")?.[1];
    }

    /**
     * Metacognition reasoning - why this lesson is worth learning
     */
    get metacognition(): string | undefined {
        return this.tagValue("metacognition");
    }

    set metacognition(value: string | undefined) {
        this.removeTag("metacognition");
        if (value) this.tags.push(["metacognition", value]);
    }
}