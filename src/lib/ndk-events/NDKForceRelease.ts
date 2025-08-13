import { NDKEvent, NDKKind, NostrEvent } from '@nostr-dev-kit/ndk'
import { EVENT_KINDS } from '../constants'

export class NDKForceRelease extends NDKEvent {
  constructor(ndk?: any, rawEvent?: NostrEvent) {
    super(ndk, rawEvent)
    this.kind = EVENT_KINDS.FORCE_RELEASE as NDKKind
  }

  static from(event: NDKEvent): NDKForceRelease {
    return new NDKForceRelease(event.ndk, event.rawEvent())
  }

  get projectReference(): string | undefined {
    return this.tagValue('a')
  }

  set projectReference(value: string | undefined) {
    this.removeTag('a')
    if (value) {
      this.tags.push(['a', value])
    }
  }

  get reason(): string | undefined {
    return this.tagValue('reason')
  }

  set reason(value: string | undefined) {
    this.removeTag('reason')
    if (value) {
      this.tags.push(['reason', value])
    }
  }

  static create(projectReference: string, reason?: string): NDKForceRelease {
    const event = new NDKForceRelease()
    event.projectReference = projectReference
    if (reason) {
      event.reason = reason
    }
    event.created_at = Math.floor(Date.now() / 1000)
    return event
  }
}