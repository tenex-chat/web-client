# Testing Agent and MCP Installation Fix

## Problem Reported
User reported that MCP cards allow installation from the modal, but agent cards only show "View on njump" without installation capability.

## Changes Made
1. Aligned the installation button logic between AgentDefinitionEmbedCard and MCPToolEmbedCard
2. Both now use identical conditions: `{user && (projectIdFromUrl || selectedProjectId) && project && (`
3. Simplified debug logging to focus on key conditions
4. Ensured both card types have identical installation functionality

## Testing Instructions

### Test Case 1: On a Project Page
1. Navigate to `/projects/[your-project-id]`
2. Find or create content with agent and MCP references
3. Click on an agent embed card
4. **Expected**: Modal opens with Install button visible (if signed in)
5. Click on an MCP embed card
6. **Expected**: Modal opens with Install button visible (if signed in)

### Test Case 2: Outside Project Context
1. Navigate to home page or feed
2. Find or create content with agent and MCP references
3. Click on an agent embed card
4. **Expected**: Modal opens with project selector dropdown (if signed in and has projects)
5. Select a project from dropdown
6. **Expected**: Install button appears
7. Repeat for MCP card - should behave identically

### Test Case 3: Debug Console
1. Open browser developer console
2. Click on embed cards to open modals
3. Look for console logs:
   - `[AgentDefinitionEmbedCard] Modal opened:`
   - `[MCPToolEmbedCard] Modal opened:`
4. Check these values:
   - `hasUser`: Should be true if signed in
   - `hasProject`: Should be true if project is available
   - `willShowInstallButton`: Should be true when all conditions are met

## Verification Checklist
- [ ] Agent cards show Install button when on project page
- [ ] MCP cards show Install button when on project page
- [ ] Agent cards show project selector when not on project page
- [ ] MCP cards show project selector when not on project page
- [ ] Install button appears after selecting project for agents
- [ ] Install button appears after selecting project for MCPs
- [ ] Both card types behave identically

## Key Code Locations
- Agent card: `/src/components/embeds/AgentDefinitionEmbedCard.tsx`
- MCP card: `/src/components/embeds/MCPToolEmbedCard.tsx`
- Both use identical logic for showing the install button