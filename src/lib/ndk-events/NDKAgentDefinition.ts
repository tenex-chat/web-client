import { NDKEvent, type NDKKind, type NostrEvent } from '@nostr-dev-kit/ndk-hooks'
import type NDK from '@nostr-dev-kit/ndk-hooks'

export class NDKAgentDefinition extends NDKEvent {
  static kind: NDKKind = 4199 as NDKKind;
  static kinds: [4199];

  constructor(ndk?: NDK, rawEvent?: NostrEvent) {
    super(ndk, rawEvent)
    this.kind = NDKAgentDefinition.kind
    if (!this.tags) {
      this.tags = []
    }
    if (!this.content) {
      this.content = ''
    }
  }

  static from(event: NDKEvent) {
    return new NDKAgentDefinition(event.ndk, event.rawEvent())
  }

  get name(): string {
    return this.tagValue('title') || ''
  }

  set name(value: string) {
    this.removeTag('title')
    if (value) {
      this.tags.push(['title', value])
    }
  }

  get description(): string {
    return this.tagValue('description') || this.content || ''
  }

  set description(value: string) {
    this.removeTag('description')
    this.content = value
    if (value) {
      this.tags.push(['description', value])
    }
  }

  get role(): string {
    return this.tagValue('role') || 'assistant'
  }

  set role(value: string) {
    this.removeTag('role')
    if (value) {
      this.tags.push(['role', value])
    }
  }

  get instructions(): string {
    return this.tagValue('instructions') || ''
  }

  set instructions(value: string) {
    this.removeTag('instructions')
    if (value) {
      this.tags.push(['instructions', value])
    }
  }

  get useCriteria(): string[] {
    return this.tags
      .filter(tag => tag[0] === 'use-criteria')
      .map(tag => tag[1])
  }

  set useCriteria(criteria: string[]) {
    this.tags = this.tags.filter(tag => tag[0] !== 'use-criteria')
    criteria.forEach(criterion => {
      this.tags.push(['use-criteria', criterion])
    })
  }

  get model(): string | undefined {
    return this.tagValue('model')
  }

  set model(value: string | undefined) {
    this.removeTag('model')
    if (value) {
      this.tags.push(['model', value])
    }
  }

  get picture(): string | undefined {
    return this.tagValue('picture') || this.tagValue('image')
  }

  set picture(url: string | undefined) {
    this.removeTag('picture')
    this.removeTag('image')
    if (url) {
      this.tags.push(['picture', url])
    }
  }

  get version(): string | undefined {
    return this.tagValue('version')
  }

  set version(value: string | undefined) {
    this.removeTag('version')
    if (value) {
      this.tags.push(['version', value])
    }
  }

}