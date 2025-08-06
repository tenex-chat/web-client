# Critical: NDK Version Conflict

## Issue
The project has a version conflict between different NDK packages that prevents successful compilation.

## Details
- Multiple versions of `@nostr-dev-kit/ndk` are installed
- The `ndk-hooks` package is using a different version than the main NDK package
- This causes TypeScript errors due to incompatible type definitions

## Error Examples
```
Type 'import(".../ndk-hooks/node_modules/@nostr-dev-kit/ndk/dist/index").default' 
is not assignable to type 'import(".../ndk/dist/index").default'.
Types have separate declarations of a private property '_explicitRelayUrls'.
```

## Impact
- Build failures
- TypeScript compilation errors
- Potential runtime issues

## Recommended Fix
1. Check and align all NDK package versions in package.json
2. Run `npm dedupe` to consolidate duplicate packages
3. Consider using npm overrides or resolutions to force a single version
4. Test thoroughly after fixing as this affects core functionality

## Risk Level
HIGH - This requires careful version management and thorough testing