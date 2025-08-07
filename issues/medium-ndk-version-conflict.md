# NDK Version Conflict Issue

## Severity: Medium

## Description
There is a version conflict between `@nostr-dev-kit/ndk` and `@nostr-dev-kit/ndk-hooks` packages. The ndk-hooks package appears to be using a different version of NDK internally, causing TypeScript type incompatibilities.

## Error Pattern
All errors follow this pattern:
```
Types have separate declarations of a private property '_explicitRelayUrls'.
```

This indicates that the two packages are using different versions of the same NDK classes.

## Affected Files
- src/App.tsx
- src/components/AgentDiscoveryExample.tsx
- src/components/AgentRequestsPage.tsx
- src/components/agents/AgentDetailPage.tsx
- src/components/agents/AgentProfile.tsx
- src/components/agents/AgentSelector.tsx
- src/lib/ndk-setup.ts
- src/stores/project/index.ts

## Root Cause
The `@nostr-dev-kit/ndk-hooks` package has its own dependency on `@nostr-dev-kit/ndk` that differs from the version specified in package.json. This creates two different NDK type definitions in the node_modules tree.

## Recommended Solution
1. Check if there's a newer version of `@nostr-dev-kit/ndk-hooks` that is compatible with the current NDK version
2. Consider using npm/yarn resolutions to force a single NDK version
3. Alternatively, align both packages to use the same NDK version

## Workaround
For now, the application should still function at runtime despite these TypeScript errors, as the actual JavaScript code is compatible. The build can be forced with `--force` flag if needed.

## Risk Assessment
- **Impact**: High (prevents clean builds)
- **Complexity**: Medium (requires package version alignment)
- **Risk**: Medium (changing package versions could introduce runtime issues)