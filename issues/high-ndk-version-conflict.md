# High Severity: NDK Version Conflict

## Issue
There is a critical version conflict between `@nostr-dev-kit/ndk` and `@nostr-dev-kit/ndk-hooks` packages. The hooks package is using a different version of NDK internally, causing TypeScript compilation errors throughout the codebase.

## Impact
- Build fails with multiple TypeScript errors
- Type incompatibility between NDK instances
- Affects most components that use NDK

## Root Cause
The `@nostr-dev-kit/ndk-hooks` package has its own internal dependency on `@nostr-dev-kit/ndk`, which is a different version than the one directly installed in the project. This creates two different NDK type definitions that TypeScript sees as incompatible.

## Error Pattern
```
Types have separate declarations of a private property '_explicitRelayUrls'
```

## Affected Files (sample)
- src/App.tsx
- src/components/AgentDiscoveryExample.tsx
- src/components/AgentRequestsPage.tsx
- src/components/agents/AgentDetailPage.tsx
- src/components/agents/AgentProfile.tsx
- src/components/agents/AgentSelector.tsx
- src/components/AgentsPage.tsx
- src/components/chat/ChatHeader.tsx
- src/components/ChatInterface.tsx
- src/components/common/NostrEntityCard.tsx
- src/components/common/ParticipantAvatarsWithModels.tsx
- src/components/DesktopLayout.tsx

## Recommended Fix
1. Ensure both packages use the same version of NDK
2. Consider using npm/yarn resolutions to force a single version
3. Update package.json to use compatible versions
4. Consider using peerDependencies if maintaining the hooks package

## Severity: HIGH
This is blocking builds and needs immediate attention.