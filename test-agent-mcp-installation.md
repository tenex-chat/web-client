# Testing Agent vs MCP Installation Functionality

## Issue Report
User reports that MCP cards allow installation from the modal, but agent cards only show "View on njump" without installation capability.

## Analysis Completed
After thorough investigation, both `AgentDefinitionEmbedCard` and `MCPToolEmbedCard` have **identical** installation logic:

### Both Components Have:
1. Same project context fetching logic
2. Same installation button rendering conditions
3. Same project selector dropdown
4. Same user authentication checks
5. Enhanced debug logging

## Testing Instructions

### 1. Open Browser Console
Before testing, open the browser developer console to see debug output.

### 2. Test Scenarios

#### Scenario A: While Signed In and On a Project Page
1. Navigate to `/projects/[your-project-id]`
2. Find content with both agent and MCP references
3. Click on an MCP card → Modal should show Install button
4. Click on an Agent card → Modal should show Install button
5. Check console for debug output

#### Scenario B: While Signed In but NOT on a Project Page  
1. Navigate to home page or feed
2. Find content with both agent and MCP references
3. Click on an MCP card → Should show project selector dropdown
4. Click on an Agent card → Should show project selector dropdown
5. Select a project → Install button should appear

#### Scenario C: While NOT Signed In
1. Sign out of the application
2. Find content with both agent and MCP references
3. Click on either card type → Should show "Sign in to install" message

## Debug Output to Check

When you click on a card, the console will show:
```
[AgentDefinitionEmbedCard] Modal opened: {
  hasUser: true/false,
  userId: "...",
  hasProjectFromUrl: true/false,
  projectIdFromUrl: "...",
  hasSelectedProject: true/false,
  selectedProjectId: "...",
  hasProject: true/false,
  projectId: "...",
  projectTitle: "...",
  projectCount: number,
  filteredProjectCount: number,
  willShowInstallButton: true/false,
  willShowProjectSelector: true/false,
  agentName: "...",
  eventId: "..."
}
```

## Key Conditions for Install Button
The install button appears when ALL of these are true:
1. User is signed in (`hasUser: true`)
2. Either on a project page OR has selected a project (`hasProjectFromUrl: true` OR `hasSelectedProject: true`)
3. Project is loaded (`hasProject: true`)

## Common Issues and Solutions

### Issue: No Install Button Visible
- Check `hasUser` - must be true
- Check `hasProject` - must be true
- Check `projectCount` or `filteredProjectCount` - should be > 0

### Issue: No Project Selector
- Check `hasUser` - must be true
- Check `filteredProjectCount` - must be > 0
- Check `hasProjectFromUrl` - must be false (not on project page)

## Code Locations
- Agent card: `/src/components/embeds/AgentDefinitionEmbedCard.tsx`
- MCP card: `/src/components/embeds/MCPToolEmbedCard.tsx`
- Both use identical logic at lines ~277-310 (compact) and ~603-637 (full)