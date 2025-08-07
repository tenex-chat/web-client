# Critical: NDK Type Conflicts During Build

## Severity: CRITICAL

## Issue
The build process fails with multiple TypeScript errors related to NDK version conflicts. There appear to be two different versions of NDK installed that have incompatible types.

## Error Summary
- Multiple instances of NDK types with separate private property declarations
- Type incompatibilities between `@nostr-dev-kit/ndk` and `@nostr-dev-kit/ndk-hooks` packages
- Affects critical components including App.tsx, agent components, and stores

## Key Error Pattern
```
Types have separate declarations of a private property '_explicitRelayUrls'
```

## Affected Files
- src/App.tsx
- src/components/AgentDiscoveryExample.tsx
- src/components/AgentRequestsPage.tsx
- src/hooks/useAgentActions.ts
- src/hooks/useAgentLessons.ts
- src/hooks/useInstructionActions.ts
- src/hooks/useMCPToolActions.ts
- src/lib/ndk-setup.ts
- src/stores/project/index.ts
- Many more...

## Root Cause
The `@nostr-dev-kit/ndk-hooks` package appears to have its own version of NDK that conflicts with the main `@nostr-dev-kit/ndk` package, causing type incompatibilities throughout the codebase.

## Recommended Fix
1. Check and align NDK package versions across all dependencies
2. Consider using a single version of NDK throughout the project
3. May need to update `@nostr-dev-kit/ndk-hooks` to use the same NDK version as the main package
4. Could require package.json overrides or resolutions to force a single NDK version

## Impact
- Build completely fails
- Cannot deploy to production
- Type safety is compromised

## Temporary Workaround
None available - this blocks the build process entirely.