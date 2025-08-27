# Collapsible Replies Feature

## Feature Overview

The collapsible replies feature provides a streamlined way to manage nested conversation threads in the chat interface. This feature automatically collapses reply threads that exceed a certain depth, helping users focus on the main conversation flow while still maintaining access to detailed sub-conversations when needed.

## User Guide

### Viewing Collapsed Replies

When a message has replies that are collapsed:
- A button appears showing the number of hidden replies (e.g., "Show 3 replies")
- The button displays with a chevron icon indicating the collapsed state
- Only the first reply in the thread remains visible by default

### Expanding Replies

To view all replies in a thread:
- Click the "Show X replies" button
- The thread expands to reveal all nested replies
- The button text changes to "Hide replies" with an updated chevron icon
- All replies become visible with their full content and any nested sub-replies

### Collapsing Replies

To collapse an expanded thread:
- Click the "Hide replies" button
- The thread collapses back to showing only the first reply
- The button reverts to showing "Show X replies"

### Automatic Behavior

- Threads with 3 or fewer replies remain expanded by default
- Threads with more than 3 replies are automatically collapsed on initial load
- The collapse state persists during the current session

## Implementation Details

The collapsible replies feature is implemented in `src/components/chat/MessageWithReplies.tsx` with the following key components:

### State Management
- Uses React's `useState` hook to track the collapsed/expanded state
- Initial state is determined by the number of replies (collapsed if more than 3)

### Conditional Rendering
- When collapsed: Renders only the first reply using array slicing (`replies.slice(0, 1)`)
- When expanded: Renders all replies in the thread
- The toggle button is only shown when there are multiple replies

### UI Components
- Utilizes the `Button` component from the UI library with `variant="ghost"` and `size="sm"`
- Incorporates `ChevronDown` and `ChevronUp` icons from lucide-react for visual state indication
- Maintains consistent spacing and styling with the existing chat interface

### Nested Structure Support
- Each reply can itself have nested replies, creating a recursive tree structure
- The collapsible behavior applies at each level of the reply hierarchy
- Preserves the full conversation context while improving readability

### Performance Considerations
- Reduces initial DOM complexity by not rendering hidden replies
- Lazy rendering approach improves performance for threads with many nested replies
- State management is localized to each `MessageWithReplies` component instance