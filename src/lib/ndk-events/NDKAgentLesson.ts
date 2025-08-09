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

    set title(value: string | undefined) {
        this.removeTag("title");
        if (value) this.tags.push(["title", value]);
    }

    get lesson(): string {
        return this.content;
    }

    set lesson(value: string) {
        this.content = value;
    }

    set agent(agentEvent: NDKEvent) {
        this.removeTag("e");
        this.tag(agentEvent);
    }

    get agentId(): string | undefined {
        return this.tags.find((tag) => tag[0] === "e")?.[1];
    }

    get metacognition(): string | undefined {
        return this.tagValue("metacognition");
    }

    set metacognition(value: string | undefined) {
        this.removeTag("metacognition");
        if (value) this.tags.push(["metacognition", value]);
    }

    get reasoning(): string | undefined {
        return this.tagValue("reasoning");
    }

    set reasoning(value: string | undefined) {
        this.removeTag("reasoning");
        if (value) this.tags.push(["reasoning", value]);
    }

    get reflection(): string | undefined {
        return this.tagValue("reflection");
    }

    set reflection(value: string | undefined) {
        this.removeTag("reflection");
        if (value) this.tags.push(["reflection", value]);
    }
}