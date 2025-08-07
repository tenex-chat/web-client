# High Priority: Remaining Build Errors

## Issue Summary
Multiple TypeScript compilation errors preventing successful build

## Severity: HIGH
These errors block production deployment.

## Errors Found

### 1. NDKProject Type Incompatibility
**Location**: `src/stores/project/index.ts:66`
**Error**: Type '(project: NDKProject) => void' is not assignable to type '(event: NDKEvent, relay?: NDKRelay | undefined) => void'
**Cause**: NDKProject and NDKEvent types are incompatible in subscription callbacks

### 2. MurfVoices Type Errors
**Location**: `src/hooks/useMurfVoices.ts`
- Line 54: Argument of type '{}' is not assignable to parameter of type 'string'
- Line 83: Type 'string | undefined' is not assignable to type 'string'

### 3. Multiple NDKEvent Return Type Issues
**Location**: Various conversation-related hooks
- Functions returning Promise<NDKEvent> where Promise<void> is expected

## Root Cause
The NDK library appears to have breaking changes between versions that affect:
1. Event/Project type hierarchies
2. Subscription callback signatures
3. Return type expectations

## Recommended Fix
1. Review and update all NDK event subscriptions to match current API
2. Add proper type guards for undefined values
3. Update return types to match expected signatures
4. Consider pinning NDK to a stable version with known compatibility

## Impact
- Build fails
- Cannot deploy to production
- Type safety compromised

## Priority
HIGH - Blocks deployment and development workflow