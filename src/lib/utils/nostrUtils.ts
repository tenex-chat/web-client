import { NDKEvent } from '@nostr-dev-kit/ndk'

export const findTagValue = (event: NDKEvent, tagName: string): string | undefined => {
  return event.tags?.find(tag => tag[0] === tagName)?.[1]
}

export const findAllTagValues = (event: NDKEvent, tagName: string): string[] => {
  return event.tags?.filter(tag => tag[0] === tagName).map(tag => tag[1]) || []
}

export const parseVersion = (version: string | undefined | null): number => {
  return parseInt(version || '0', 10)
}

export const compareVersions = (a: { version?: string | null }, b: { version?: string | null }): number => {
  return parseVersion(b.version) - parseVersion(a.version)
}