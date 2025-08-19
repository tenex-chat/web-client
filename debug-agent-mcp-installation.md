# Debug Instructions for Agent/MCP Installation Issue

## Enhanced Debug Logging Added

Both `AgentDefinitionEmbedCard.tsx` and `MCPToolEmbedCard.tsx` now have detailed debug logging that will help identify the exact issue.

## How to Debug

1. **Open Browser Console**
   - Press F12 or right-click and select "Inspect"
   - Go to the "Console" tab

2. **Test Agent Card**
   - Click on an agent embed card to open the modal
   - Look for console log starting with `[AgentDefinitionEmbedCard] Modal opened:`
   - Check these specific values:
     ```javascript
     installButtonConditions: {
       hasUser: true/false,           // Must be true to show install
       hasProjectIdFromUrlOrSelected: true/false,  // Must be true
       hasProject: true/false,         // Must be true
       combined: true/false           // This determines if install button shows
     }
     selectorConditions: {
       hasUser: true/false,           // Must be true to show selector
       noProject: true/false,         // Must be true
       hasProjectsWithDTag: true/false,  // Must be true
       combined: true/false           // This determines if selector shows
     }
     ```

3. **Test MCP Card**
   - Click on an MCP embed card to open the modal
   - Look for console log starting with `[MCPToolEmbedCard] Modal opened:`
   - Compare the same values as above

## What to Look For

### Scenario 1: On a Project Page
- `projectIdFromUrl` should have a value
- `hasProject` should be true
- `installButtonConditions.combined` should be true
- Install button should be visible

### Scenario 2: Outside Project Context
- `projectIdFromUrl` should be null
- Initially `hasProject` should be false
- `selectorConditions.combined` should be true (if user has projects)
- Project selector should be visible
- After selecting a project:
  - `selectedProjectId` should have a value
  - `hasProject` should become true
  - `installButtonConditions.combined` should become true
  - Install button should appear

## Key Differences to Report

If agent cards behave differently from MCP cards, please report:

1. Which specific condition is different between the two
2. The exact values shown in the console for both cards
3. Whether the project selector appears for one but not the other
4. Whether the install button appears for one but not the other

## Code Locations

- Agent card logic: `/src/components/embeds/AgentDefinitionEmbedCard.tsx` lines 323-393
- MCP card logic: `/src/components/embeds/MCPToolEmbedCard.tsx` lines 262-332

Both use IDENTICAL conditions for showing the install button and project selector.