# Test Agent Definition Embeds

This document tests if agent definition events (kind:4199) are rendered correctly when referenced in content.

## Test Case 1: Inline Agent Reference
Here's an agent definition: naddr1xyz (replace with actual naddr)

## Test Case 2: Multiple Agent References
Agent 1: naddr1abc
Agent 2: naddr1def

## Test Case 3: Mixed Content
You can install this MCP tool: nevent1mcp and this agent: naddr1agent

## How to Test:
1. Create an NDKAgentDefinition event (kind:4199) 
2. Get its naddr reference
3. Include it in any content that uses NostrEntityCard
4. It should render with:
   - Agent name and avatar
   - Role badge
   - Description
   - Install button (when in project context)
   - Modal with full details on click