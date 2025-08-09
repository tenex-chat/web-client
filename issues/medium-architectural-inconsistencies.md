# MEDIUM: Architectural Inconsistencies and Technical Debt

## Severity: MEDIUM

## Issue Description

The codebase has several architectural inconsistencies that create confusion and technical debt.

### 1. Conflicting State Management Patterns

**Location**: 
- Zustand: `src/stores/projects.ts`, `src/stores/agents.ts`
- Jotai: `src/stores/llm.ts`, `src/stores/llmConfig.ts`, `src/stores/ui.ts`

**Problem**: Using two different state management libraries increases complexity and cognitive load.

### 2. Contradictory NDK Wrapper Guidelines

**Location**: 
- `FEATURE_INVENTORY.md` states "NEVER create wrapper types around NDK"
- Yet codebase extensively uses: `NDKProject`, `NDKAgent`, `NDKMCPTool`, `NDKTask`, `NDKProjectStatus`

**Problem**: Direct contradiction between stated guidelines and implementation creates confusion.

### 3. Incomplete Features Marked as Complete

**Location**:
- `src/components/projects/ProjectCard.tsx` - Mock unreadCount
- `src/components/settings/LLMSettings.tsx` - Fake API test
- Multiple TODO comments throughout codebase

**Problem**: Features marked as "100% complete" in MILESTONES.md but have incomplete implementations.

### 4. TypeScript Errors Ignored

**Location**: 
- `MILESTONES.md` acknowledges 33 TypeScript errors remaining
- `tsconfig.json` has `skipLibCheck: true`

**Problem**: Type safety compromised, potential runtime errors.

## Impact

- Developer confusion and increased onboarding time
- Inconsistent patterns leading to bugs
- Technical debt accumulation
- Maintenance challenges
- Reduced code quality

## Recommended Solution

### Immediate Actions
1. Choose single state management library and migrate
2. Update documentation to reflect actual patterns
3. Fix all TypeScript errors
4. Complete or remove incomplete features

### Long-term Solution
1. Establish clear architectural guidelines
2. Implement ADRs (Architecture Decision Records)
3. Regular technical debt review sessions
4. Enforce consistency through linting rules
5. Document patterns in developer guide

## Risk Level
While not immediately critical, these inconsistencies will compound over time, making the codebase increasingly difficult to maintain and extend. Addressing these now will prevent future development slowdowns.