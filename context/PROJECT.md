## Stopping a Claude Code Session

The process for stopping an ongoing `claude_code` session involves the following:

1. **Frontend Action:** The frontend sends an HTTP DELETE request.  
2. **Endpoint:** The request is sent to the `/sessions/{sessionId}` endpoint on the TENEX daemon.  
3. **Backend Handler:** The daemon receives this request and calls the necessary method on the `ClaudeTaskExecutor` to gracefully terminate the task.  

This ensures a clean and reliable way to halt ongoing operations. It is critical that the proper routing to the `ClaudeTaskExecutor` occurs for effective session management.

---

## NDKProject Delete Behavior

When deleting a project (NIP-33 replaceable event, kind 31933), the code now:
1. Publishes a deletion event (kind 5) for backward compatibility
2. Republishes the project event with a ["deleted"] tag for proper NIP-33 replaceable event handling

This dual approach ensures both compatibility with clients expecting deletion events and proper handling of replaceable events.

---

## NDKAgentDefinition Phase Management

The NDKAgentDefinition CRUD interface must support phase definitions for agent workflow management:

### Phase Definition Structure
- **Tag Format**: `[ "phase", "<name>", "<instructions>" ]`
- **Multiple Phases**: Agents can have 0 or more phase definitions
- **Agent Types**: 
  - Non-PM agents typically have no phase definitions
  - Project Manager agents will likely define multiple phases

### User Interface Requirements

#### Agent Definition Form
- Must allow adding/removing phase definitions dynamically
- Support for 0 or more phases (no minimum requirement)
- Each phase requires:
  - Name (string identifier)
  - Instructions (descriptive text for the phase)

#### Agent Definition Card Display
- Show phase count when > 0 phases are defined
- Display format: "X phases" or similar indicator
- No phase indicator needed when count is 0

#### Agent Details Page
- Must include a dedicated "Phases" tab
- Tab should only be visible/accessible when phases exist
- Phase tab displays all defined phases with their names and instructions
- Phases should be presented in a clear, readable format

### Data Model
Phase definitions are stored as Nostr event tags within the NDKAgentDefinition event, allowing for flexible phase configuration per agent while maintaining compatibility with the broader Nostr ecosystem.

---