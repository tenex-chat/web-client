## Stopping a Claude Code Session

The process for stopping an ongoing `claude_code` session involves the following:

1. **Frontend Action:** The frontend sends an HTTP DELETE request.  
2. **Endpoint:** The request is sent to the `/sessions/{sessionId}` endpoint on the TENEX daemon.  
3. **Backend Handler:** The daemon receives this request and calls the necessary method on the `ClaudeTaskExecutor` to gracefully terminate the task.  

This ensures a clean and reliable way to halt ongoing operations. It is critical that the proper routing to the `ClaudeTaskExecutor` occurs for effective session management.

---

## NDKProject Delete Behavior (2025-01-10)

When deleting a project (NIP-33 replaceable event, kind 31933), the code now:
1. Publishes a deletion event (kind 5) for backward compatibility
2. Republishes the project event with a ["deleted"] tag for proper NIP-33 replaceable event handling

This dual approach ensures both compatibility with clients expecting deletion events and proper handling of replaceable events.

---