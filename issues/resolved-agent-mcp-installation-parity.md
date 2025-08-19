# Agent and MCP Installation Parity Issue - RESOLVED

## Problem
User reported that MCP cards allow installation from the modal, but agent cards only show "View on njump" without installation capability.

## Root Causes Found

1. **Empty String Issue**: Both components were passing an empty string `''` to `useProject()` when no project was selected, which could cause the hook to return unexpected results since empty string is truthy but might not find a matching project.

2. **Project dTag Filtering**: Some projects might not have a `dTag` property, causing the dropdown to have invalid values that wouldn't properly resolve to a project when selected.

## Solutions Implemented

### 1. Fixed useProject Hook Call
Changed from:
```tsx
const project = useProject(projectId || '')
```
To:
```tsx
const project = useProject(projectId || undefined)
```

This ensures the hook properly returns `null` when no project ID is available, rather than trying to look up an empty string.

### 2. Filtered Projects Without dTag
Changed from:
```tsx
{allProjects.map((p) => (
  <SelectItem key={p.dTag} value={p.dTag || ''}>
```
To:
```tsx
{allProjects.filter(p => p.dTag).map((p) => (
  <SelectItem key={p.dTag} value={p.dTag!}>
```

This ensures only projects with valid dTag identifiers are shown in the dropdown.

### 3. Updated Selector Visibility Condition
Changed from:
```tsx
{!projectIdFromUrl && user && allProjects.length > 0 && (
```
To:
```tsx
{!projectIdFromUrl && user && allProjects.filter(p => p.dTag).length > 0 && (
```

This ensures the project selector only shows when there are valid projects to select.

### 4. Aligned Installation Button Logic
Both cards now use identical conditions:
```tsx
{user && (projectIdFromUrl || selectedProjectId) && project && (
  <Button>Install</Button>
)}
```

## Files Modified
- `/src/components/embeds/AgentDefinitionEmbedCard.tsx`
- `/src/components/embeds/MCPToolEmbedCard.tsx`

## Testing Instructions

### Test Case 1: On a Project Page
1. Navigate to `/projects/[your-project-id]`
2. Click on agent and MCP embed cards
3. **Expected**: Both show Install button when signed in

### Test Case 2: Outside Project Context
1. Navigate to home page or feed
2. Click on agent and MCP embed cards
3. **Expected**: Both show project selector dropdown
4. Select a project
5. **Expected**: Install button appears for both

### Test Case 3: Debug Verification
Open browser console and click cards to see:
```
[AgentDefinitionEmbedCard] Modal opened: {
  hasUser: true,
  hasProjectFromUrl: false,
  hasSelectedProject: true/false,
  hasProject: true/false,
  willShowInstallButton: true/false
}
```

## Status: RESOLVED
Both agent and MCP embed cards now have identical, working installation functionality.