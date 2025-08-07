# High Severity: TypeScript Build Errors

## Severity: HIGH

## Summary
The web-client project has numerous TypeScript compilation errors that prevent successful builds. These need to be addressed to ensure type safety and proper compilation.

## Impact
- Build process fails with `npm run build`
- Type safety is compromised
- Development experience is degraded
- Potential runtime errors due to type mismatches

## Affected Files (80+ errors)
Major error categories:

### Import Type Issues
- `src/components/DesktopLayout.tsx` - Using type imports as values
- `src/components/common/__tests__/ErrorBoundary.test.tsx` - Missing test utilities

### NDK Type Mismatches
- Multiple files expecting `NDKProject` but receiving `NDKEvent`
- Missing properties on NDK types (e.g., `title`, `name`, `icon`)
- Type casting issues between NDK event types

### Hook and Form Issues
- `useMCPToolForm` - Missing properties like `errors`, `addPath`, `removePath`
- `useLLMConfig` - Spread operator issues with unknown types
- Configuration object type issues

### Component Prop Mismatches
- `ParticipantAvatarsWithModelsProps` - Incompatible props
- `MarkdownRenderer` - Component type issues
- Various dialog components with incorrect prop types

## Recommended Actions
1. Fix import statements - ensure type imports are not used as values
2. Add proper type assertions for NDK events
3. Update hook interfaces to match expected properties
4. Add missing test setup utilities
5. Review and fix component prop interfaces
6. Add proper type guards for configuration objects

## Files Requiring Immediate Attention
1. `src/stores/project/index.ts` - Fixed casting issue
2. `src/components/common/__tests__/ErrorBoundary.test.tsx` - Add afterEach import
3. `src/hooks/useLLMConfig.ts` - Fix spread operator with unknown types
4. `src/components/mcp/PublishMCPToolDialog.tsx` - Add missing form properties

## Notes
These errors appear to be from recent refactoring or NDK library updates. A systematic review of all TypeScript errors is needed to restore build functionality.