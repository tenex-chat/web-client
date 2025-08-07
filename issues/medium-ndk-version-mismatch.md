# Medium Risk: NDK Version Mismatch Issue

## Problem
The web-client has a dependency conflict where two different versions of `@nostr-dev-kit/ndk` are installed:
1. Direct dependency: `@nostr-dev-kit/ndk@^2.14.33`
2. Indirect dependency via `@nostr-dev-kit/ndk-hooks` which uses a different version

This causes TypeScript compilation errors due to incompatible type definitions between the two versions.

## Impact
- Build fails with TypeScript errors
- Cannot compile for production
- Type safety is compromised

## Evidence
Multiple TypeScript errors like:
```
Types have separate declarations of a private property '_explicitRelayUrls'
```

## Recommended Solution
1. Ensure all NDK-related packages use the same version of the core NDK library
2. Consider using npm/yarn resolutions to force a single version
3. Or update all NDK packages to their latest compatible versions

## Workaround
Add to package.json:
```json
"overrides": {
  "@nostr-dev-kit/ndk": "^2.14.33"
}
```

Or for yarn:
```json
"resolutions": {
  "@nostr-dev-kit/ndk": "^2.14.33"
}
```

## Risk Assessment
Medium risk - This is a dependency management issue that blocks builds but doesn't affect runtime behavior once resolved.