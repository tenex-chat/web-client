import { NDKEvent, type NDKKind, type NostrEvent } from '@nostr-dev-kit/ndk-hooks'
import type NDK from '@nostr-dev-kit/ndk-hooks'

export class NDKMCPTool extends NDKEvent {
		static kind: NDKKind = 4200 as NDKKind;
		static kinds = [4200];

		constructor(ndk?: NDK, rawEvent?: NostrEvent) {
			super(ndk, rawEvent);
			this.kind = NDKMCPTool.kind;
			if (!this.tags) {
				this.tags = [];
			}
			if (!this.content) {
				this.content = "";
			}
		}

		static from(event: NDKEvent) {
			return new NDKMCPTool(event.ndk, event.rawEvent());
		}

		get name(): string {
			return this.tagValue("name") || "";
		}

		set name(value: string) {
			this.removeTag("name");
			if (value) {
				this.tags.push(["name", value]);
			}
		}

		get description(): string {
			return this.content;
		}

		set description(value: string) {
			this.content = value;
		}

		get command(): string {
			return this.tagValue("command") || "";
		}

		set command(value: string) {
			this.removeTag("command");
			if (value) {
				this.tags.push(["command", value]);
			}
		}

		get parameters(): Record<string, any> {
			const params = this.tagValue("params");
			return params ? JSON.parse(params) : {};
		}

		set parameters(value: Record<string, any>) {
			this.removeTag("params");
			this.tags.push(["params", JSON.stringify(value)]);
		}

		get capabilities(): string[] {
			return this.tags
				.filter((tag) => tag[0] === "capability")
				.map((tag) => tag[1]);
		}

		set capabilities(caps: string[]) {
			this.tags = this.tags.filter((tag) => tag[0] !== "capability");
			caps.forEach((cap) => {
				this.tags.push(["capability", cap]);
			});
		}

	}