# Critical: NDK Type Conflicts

## Severity: Critical

## Issue
There are type incompatibilities between different versions of NDK packages causing build failures:

1. **NDK Event Type Mismatch**: `@nostr-dev-kit/ndk-hooks` appears to be using a different version of `@nostr-dev-kit/ndk` internally, causing type incompatibilities.

2. **Private Property Conflicts**: Types have separate declarations of private property `_explicitRelayUrls`.

## Affected Files
- `src/stores/project/index.ts` (lines 67, 253)
- Multiple components using NDKEvent types

## Error Details
```
Type 'import("...ndk-hooks/node_modules/@nostr-dev-kit/ndk/dist/index").NDKEvent' 
is not assignable to type 'import("...@nostr-dev-kit/ndk/dist/index").NDKEvent'
```

## Root Cause
Package version mismatch between:
- Direct dependency: `@nostr-dev-kit/ndk@^2.14.33`
- Transitive dependency via `@nostr-dev-kit/ndk-hooks@^1.2.3`

## Recommended Fix
1. Ensure all NDK packages use compatible versions
2. Consider using pnpm's `overrides` or npm's `overrides` to force a single version
3. Update all NDK packages to their latest compatible versions

## Risk Assessment
- **Build Impact**: Prevents successful TypeScript compilation
- **Runtime Impact**: May cause runtime errors if types don't match actual data
- **Development Impact**: Blocks deployment and CI/CD pipelines

## Temporary Workaround
Add to `tsconfig.json`:
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```
Note: This is NOT recommended for production as it bypasses type safety.