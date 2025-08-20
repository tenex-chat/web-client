# Debugging Agent vs MCP Installation Parity Issue

## Problem
User reports that MCP cards allow installation from the modal, but agent cards only show "View on njump" without installation capability.

## Code Analysis Summary
Both `AgentDefinitionEmbedCard` and `MCPToolEmbedCard` have **identical installation logic**. The code structure is exactly the same:
- Both use the same hooks and state management
- Both extract project ID from URL the same way  
- Both show the project selector under identical conditions
- Both show the install button under identical conditions

## Enhanced Debug Logging Added
Both components now log detailed information when modals open. Look for these console logs:

### For Agent Cards:
```
[AgentDefinitionEmbedCard] Modal opened: {...}
[AgentDefinitionEmbedCard] JSX conditions: {...}
[AgentDefinitionEmbedCard] Project loaded, checking installation: {...}
```

### For MCP Cards:
```
[MCPToolEmbedCard] Modal opened: {...}
[MCPToolEmbedCard] JSX conditions: {...}
[MCPToolEmbedCard] Project loaded, checking installation: {...}
```

## Testing Instructions

### 1. Open Browser Console
Press F12 or right-click and select "Inspect" → "Console"

### 2. Test Both Card Types
1. Click on an Agent embed card to open its modal
2. Click on an MCP embed card to open its modal
3. Compare the console output for both

### 3. What to Look For

The "JSX conditions" log shows exactly what will be rendered:
```javascript
{
  'Will show project selector': // Should be true if user is logged in, no project selected, and projects exist
  'Will show install button': // Should be true if user is logged in and project is available
  'Will show no projects message': // Should be true if user has no projects
  'Will show sign in message': // Should be true if user is not logged in
}
```

### 4. Key Values to Compare

Compare these values between Agent and MCP logs:
- `hasUser`: Should be the same for both
- `hasProjectFromUrl`: Should be the same if on same page
- `hasProject`: **This is likely where the difference is**
- `projectCount`: Should be the same for both
- `filteredProjectCount`: Should be the same for both

### 5. Possible Issues to Check

1. **Project not loading for agents**: Check if `hasProject` is false for agents but true for MCP
2. **Project array empty**: Check if `projectCount` or `filteredProjectCount` is 0
3. **User not authenticated**: Check if `hasUser` is false
4. **Project ID mismatch**: Check if `projectIdFromUrl` or `selectedProjectId` differ

## Expected Behavior
Both Agent and MCP cards should show:
- Install button when: User is signed in AND project is available (from URL or selection)
- Project selector when: User is signed in AND no project selected AND projects exist
- "No projects available" when: User is signed in AND no projects exist
- "Sign in to install" when: User is not signed in

## Report Back
Please share the console output showing the difference between Agent and MCP card logs. The key is to identify which condition is different at runtime.