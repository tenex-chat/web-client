# Brainstorm Mode Implementation - Updated

## Overview
The brainstorm mode feature has been updated to match the specific requirements:

## Key Changes from Requirements

### 1. Button Visibility
- **ONLY** appears to the left of the send button
- **ONLY** visible when:
  - Chat input area is empty
  - No messages have been sent in the current conversation
  - No existing conversation is loaded (no rootEvent)
- Disappears once a message is sent or existing conversation is loaded

### 2. Button Label
- Initially shows "Brainstorm Mode"
- After moderator selection: "Brainstorm Mode (AgentName)"

### 3. Dropdown Workflow
- **Step 1**: Select moderator from list of agents
- **Step 2**: Select participants with checkboxes (excluding moderator)
- Dropdown remains open between steps for smooth flow

### 4. Message Encoding
Messages sent in brainstorm mode include:
- `["mode", "brainstorm"]` tag
- `["t", "brainstorm"]` tag  
- **Only the moderator** as a p-tag (no other participants in p-tags)
- Regular message content (not JSON encoded)

## Implementation Details

### Store (`/src/stores/brainstorm-mode-store.ts`)
- Simplified to use session-based state (not persisted)
- Automatically cleared when messages are sent
- Tracks current moderator and participants

### Button Component (`/src/components/chat/components/BrainstormModeButton.tsx`)
- Two-step dropdown interface
- Dynamic label updating
- Purple styling when active
- Clear option to reset brainstorm mode

### Chat Input Area Integration
- Button positioned to left of send button
- Visibility logic based on conversation state
- Automatic session clearing after message send

## Testing Instructions

1. **Start a new conversation** (no thread selected)
2. **Ensure input is empty** - Brainstorm Mode button should be visible
3. **Click "Brainstorm Mode"** - Dropdown opens showing agent list
4. **Select a moderator** - Button updates to show agent name
5. **Select participants** (optional) - Use checkboxes
6. **Type and send a message** - Message will have brainstorm tags
7. **After sending** - Button disappears (conversation has started)

## Verification Points

✅ Button only shows for new, empty conversations
✅ Button label starts as "Brainstorm Mode"
✅ Moderator selection updates label to include agent name
✅ Only moderator is added as p-tag in messages
✅ Messages include `["mode", "brainstorm"]` and `["t", "brainstorm"]` tags
✅ Button disappears after first message or when loading existing conversation

## Technical Notes

- No JSON encoding of message content
- No persistence of brainstorm settings
- Session automatically cleared on send
- Visual indicator (purple badge) shown on brainstorm messages