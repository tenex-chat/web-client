import { NDKEvent, type NDKKind, type NostrEvent } from '@nostr-dev-kit/ndk-hooks'
import type NDK from '@nostr-dev-kit/ndk-hooks'

export class NDKTask extends NDKEvent {
  static kind: NDKKind = 1934 as NDKKind
  static kinds = [1934];

  constructor(ndk?: NDK, rawEvent?: NostrEvent) {
    super(ndk, rawEvent)
    this.kind = NDKTask.kind
    if (!this.tags) {
      this.tags = []
    }
    if (!this.content) {
      this.content = ''
    }
  }

  static from(event: NDKEvent) {
    return new NDKTask(event.ndk, event.rawEvent());
  }

  get title(): string {
    return this.tagValue('title') || ''
  }

  set title(value: string) {
    this.removeTag('title')
    if (value) {
      this.tags.push(['title', value])
    }
  }

  get description(): string {
    return this.content
  }

  set description(value: string) {
    this.content = value
  }

  get projectId(): string | undefined {
    return this.tagValue('project')
  }

  set projectId(value: string | undefined) {
    this.removeTag('project')
    if (value) {
      this.tags.push(['project', value])
    }
  }

  get assignedTo(): string | undefined {
    return this.tagValue('assigned')
  }

  set assignedTo(pubkey: string | undefined) {
    this.removeTag('assigned')
    if (pubkey) {
      this.tags.push(['assigned', pubkey])
    }
  }

}