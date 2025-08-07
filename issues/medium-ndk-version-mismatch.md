# NDK Version Mismatch in Project Store

## Severity: Medium

## Description
There's a TypeScript error indicating that different versions of the `@nostr-dev-kit/ndk` package are being used by the main project and the `@nostr-dev-kit/ndk-hooks` dependency. This causes type incompatibility issues.

## Location
- `/src/stores/project/index.ts` lines 66 and 248

## Error Messages
```
Type 'import("/.../@nostr-dev-kit/ndk-hooks/node_modules/@nostr-dev-kit/ndk/dist/index").NDKEvent' is not assignable to type 'import("/.../@nostr-dev-kit/ndk/dist/index").NDKEvent'.
Types have separate declarations of a private property '_explicitRelayUrls'.
```

## Root Cause
The `@nostr-dev-kit/ndk-hooks` package has its own version of `@nostr-dev-kit/ndk` in its node_modules, which differs from the project's direct dependency version.

## Recommended Fix
1. Check package.json for version mismatches
2. Use npm/yarn resolutions to force a single NDK version
3. Update all NDK-related packages to compatible versions
4. Consider using `npm dedupe` or `yarn dedupe` to consolidate dependencies

## Impact
- Build failures
- Potential runtime issues with NDK event handling
- Type safety compromised between different parts of the application

## Risk Assessment
Medium risk - requires careful dependency management and testing of NDK functionality after fixing.
EOF < /dev/null