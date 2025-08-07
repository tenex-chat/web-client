# Medium: TypeScript NDK Compatibility Issues

## Summary
Multiple TypeScript compilation errors related to NDK (Nostr Development Kit) type incompatibilities in the web-client project.

## Errors Found

### 1. useLLMConfig.ts - Type 'unknown' in credentials
- **Location**: src/hooks/useLLMConfig.ts:211, 275
- **Issue**: The `credentials` field is accessed but its type is not properly defined in the base `LLMFileConfiguration`
- **Impact**: Type safety is compromised when accessing credentials

### 2. useMCPToolActions.ts - NDKMCPTool constraint violation
- **Location**: src/hooks/useMCPToolActions.ts:5
- **Issue**: `NDKMCPTool` does not satisfy the `Entity` constraint due to incompatible `delete()` return types
- **Impact**: Type mismatch preventing proper entity operations

### 3. useMurfVoices.ts - Type mismatches
- **Location**: src/hooks/useMurfVoices.ts:54, 83
- **Issues**: 
  - Argument type '{}' cannot be assigned to parameter of type 'string'
  - Type 'string | undefined' is not assignable to type 'string'
- **Impact**: Potential runtime errors with voice configuration

### 4. stores/project/index.ts - Event handler type incompatibility
- **Location**: src/stores/project/index.ts:66
- **Issue**: Type mismatch between `NDKProject` and `NDKEvent` in event handler
- **Impact**: Project store subscription handlers may not work correctly

## Root Cause
These issues appear to stem from:
1. Version mismatch or breaking changes in NDK library
2. Incomplete type definitions for extended NDK entities
3. Missing type guards for optional properties

## Recommendation
1. Review NDK library version and check for breaking changes
2. Update type definitions to properly extend NDK base types
3. Add proper type guards and null checks
4. Consider updating NDK to a compatible version or adjusting type definitions

## Risk Assessment
**Medium** - These are compile-time TypeScript errors that prevent building but don't indicate runtime crashes. However, they suggest potential type safety issues that could lead to runtime problems if not addressed properly.