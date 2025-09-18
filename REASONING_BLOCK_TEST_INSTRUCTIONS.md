# Testing Reasoning Blocks in TENEX Web Chat Interface

## Overview
The chat interface includes special "reasoning blocks" that display AI thinking processes. These blocks should automatically expand for the last reasoning message in a thread and be collapsed for all others.

## How to Access the Chat Interface

### Routes
- **Inbox Page**: `http://localhost:3001/inbox` - Shows a list of inbox events, NOT the chat interface
- **Chat Page**: `http://localhost:3001/chat/{eventId}` - The actual chat interface where messages are displayed
- **Projects Page**: `http://localhost:3001/projects` - Lists projects with chat access

### Port Information
- The dev server runs on port 3001 (or 3000 if 3001 is not available)
- Check `vite.config.ts` for port configuration

## How to Create Messages with Reasoning Blocks

### Message Structure
Reasoning messages are identified by having a `reasoning` tag in the Nostr event. The content of the reasoning tag becomes the thinking content.

### Creating Test Messages
To create a message with a reasoning block:

1. **Via the UI**: Currently, there's no direct UI method to create reasoning blocks. They are typically created by AI agents.

2. **Event Structure** (for developers):
```javascript
// A message with reasoning has this structure:
{
  kind: 1111, // GenericReply
  content: "Main message content",
  tags: [
    ["reasoning", "This is the AI's thinking process..."],
    // other tags
  ]
}
```

## How to Identify Reasoning Blocks in the UI

### Visual Indicators
1. **Collapsed State**: Shows a button/trigger labeled "AI Reasoning" with an expand icon
2. **Expanded State**: Shows the full reasoning content in a bordered container
3. **Auto-Expansion**: The LAST reasoning message in a thread should auto-expand

### DOM Structure
```html
<!-- Reasoning block container -->
<div class="my-2">
  <div class="w-full" data-state="open|closed">
    <!-- Trigger button -->
    <button>AI Reasoning</button>
    <!-- Content (when expanded) -->
    <div>Reasoning content here...</div>
  </div>
</div>
```

## Testing the Auto-Expansion Feature

### Expected Behavior
1. **Single Reasoning Message**: If there's only one message with reasoning, it should be expanded by default
2. **Multiple Reasoning Messages**: 
   - The LAST reasoning message should be expanded
   - All previous reasoning messages should be collapsed
   - Users can manually toggle any reasoning block

### Test Scenarios

#### Scenario 1: Single Reasoning Message
1. Navigate to a chat thread with one reasoning message
2. Verify the reasoning block is automatically expanded
3. Click to collapse and expand manually

#### Scenario 2: Multiple Reasoning Messages
1. Navigate to a thread with multiple reasoning messages
2. Verify only the last reasoning message is expanded
3. Verify earlier reasoning messages are collapsed
4. Test manual expansion/collapse of each block

#### Scenario 3: New Reasoning Message Added
1. Start with a thread containing reasoning messages
2. Add a new reasoning message (via agent response)
3. Verify the new message's reasoning block is expanded
4. Verify previous reasoning blocks are collapsed

## Known Issues & Debugging

### Common Problems
1. **404/500 Errors**: The inbox page (`/inbox`) is different from the chat interface. Use `/chat/{eventId}` for testing chat features.
2. **Missing Events**: Ensure you're connected to the Nostr relay and have proper authentication
3. **Reasoning Not Showing**: Check if the event has a `reasoning` tag in its structure

### Debug Information
- Check browser console for errors
- Look for console logs starting with `[InboxRoute]`, `[InboxPage]`, or message rendering logs
- The `AIReasoningBlock` component logs its state changes

## Implementation Details

### Key Files
- `/src/components/chat/AIReasoningBlock.tsx` - Reasoning block component
- `/src/components/chat/MessageContent.tsx` - Determines when to show reasoning blocks
- `/src/components/chat/ThreadedMessage.tsx` - Identifies the last reasoning message
- `/src/components/chat/Message.tsx` - Main message component

### Props Flow
1. `ThreadedMessage` finds the last message with a `reasoning` tag
2. Sets `isLastReasoningMessage={true}` for that message
3. Passes to `Message` component as `isLastMessage`
4. `Message` passes to `MessageContent`
5. `MessageContent` passes to `AIReasoningBlock`
6. `AIReasoningBlock` uses this to set initial expanded state

## Creating Test Data

To properly test this feature, you need events with reasoning tags. Since this typically comes from AI agents, you may need to:

1. Trigger an AI agent that includes reasoning in its responses
2. Use a development tool to create test events with reasoning tags
3. Look for existing conversations where AI agents have already responded

## Verification Checklist

- [ ] Can navigate to chat interface at `/chat/{eventId}`
- [ ] Can see messages in the chat thread
- [ ] Reasoning blocks are visible (collapsed or expanded)
- [ ] Last reasoning block is auto-expanded
- [ ] Previous reasoning blocks are collapsed
- [ ] Can manually toggle reasoning blocks
- [ ] No console errors related to reasoning blocks