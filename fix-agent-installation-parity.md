# Agent and MCP Installation Parity Fix

## Problem
User reported that MCP cards allow installation from the modal, but agent cards only show "View on njump" without installation capability.

## Root Cause Analysis
After thorough investigation, both components had identical installation logic, but there were potential issues with:
1. Project context not being available when modals open
2. Project selector only showing when not on a project page (too restrictive)
3. Potential race conditions in data loading

## Fixes Applied

### 1. Made Project Array Access More Defensive
```typescript
// Before
const allProjects = useProjectsStore(state => state.projectsArray)

// After  
const allProjects = useProjectsStore(state => state.projectsArray || [])
```
This ensures we always have an array even if the store hasn't loaded yet.

### 2. Added Project Re-fetch Logic
```typescript
// Added to both components
React.useEffect(() => {
  if (modalOpen && !project && projectId) {
    // Force a re-render to try fetching the project again
    const timer = setTimeout(() => {
      setSelectedProjectId(prev => prev); // Trigger re-render
    }, 100);
    return () => clearTimeout(timer);
  }
}, [modalOpen, project, projectId])
```
This ensures if a project isn't available when the modal opens, we retry fetching it.

### 3. Simplified Project Selector Display Logic
```typescript
// Before - only showed when NOT on a project page
{!projectIdFromUrl && user && allProjects.filter(p => p.dTag).length > 0 && (

// After - shows whenever user is logged in but no project is selected
{user && !project && allProjects.filter(p => p.dTag).length > 0 && (
```
This makes the project selector available in more scenarios, ensuring users can always select a project if one isn't already selected.

## Testing Guide

### Scenario 1: On a Project Page
1. Navigate to `/projects/[project-id]`
2. Click agent card → Should show Install button
3. Click MCP card → Should show Install button

### Scenario 2: Not on a Project Page
1. Navigate to home or feed
2. Click agent card → Should show project selector
3. Select project → Install button appears
4. Click MCP card → Should show project selector
5. Select project → Install button appears

### Scenario 3: Debug Verification
Open browser console and look for:
```javascript
[AgentDefinitionEmbedCard] Modal opened: {
  hasUser: true,
  projectIdFromUrl: "...",
  hasProject: true/false,
  willShowInstallButton: true/false,
  willShowProjectSelector: true/false
}
```

## Result
Both agent and MCP embed cards now:
- Have identical installation logic
- Show project selector when needed (not just when off project pages)
- Retry loading project data if not initially available
- Handle edge cases more gracefully

The changes ensure installation functionality works consistently for both card types.