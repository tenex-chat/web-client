# Quote Feature Test Guide

## Summary
Added a "Quote" option to the message dropdown menu that allows users to quote a message by creating a new chat with the quoted event's `nostr:` identifier pre-filled.

## Implementation Details

### Components Modified:

1. **MessageActionsToolbar.tsx**
   - Added Quote icon import from lucide-react
   - Added `onQuote` prop to interface
   - Added Quote menu item after Reply in both mobile and desktop layouts

2. **Message.tsx**
   - Added `onQuote` prop to MessageProps interface
   - Passes `onQuote` handler to MessageActionsToolbar

3. **MessageThread.tsx**
   - Added `onQuote` prop to MessageThreadProps interface
   - Passes `onQuote` handler to child Message components

4. **ChatMessageList.tsx**
   - Added `onQuote` prop to interface
   - Implemented `handleQuote` function that encodes the event as bech32 and calls onQuote with `nostr:` prefix
   - Passes handleQuote to all Message and MessageThread components

5. **ChatInterface.tsx**
   - Added state for `prefilledContent`
   - Implemented `handleQuote` function that:
     - Clears current thread (sets localRootEvent to null)
     - Sets prefilledContent with the quoted text
     - Focuses the input textarea
   - Passes prefilled content to ChatInputArea

6. **ChatInputArea.tsx**
   - Added props: `textareaRef`, `initialContent`, `onContentUsed`
   - Uses external textarea ref if provided
   - Handles initial content with useEffect to populate the input field

## How to Test

1. **Open a chat conversation** with existing messages
2. **Click on the three-dot menu** (⋮) on any message
3. **Select "Quote"** from the dropdown menu
4. **Verify that**:
   - The current chat is cleared (starts a new thread)
   - The input field is pre-filled with `nostr:nevent1...` (the bech32-encoded event identifier)
   - The input field is focused and ready for typing
5. **Type additional text** after the quote and send the message
6. **Verify** the message is sent with the quoted event reference

## Expected Behavior

When a user clicks "Quote" on a message:
1. A new chat thread starts (current thread is cleared)
2. The input is pre-filled with the nostr: identifier of the quoted message
3. User can add their own commentary and send the message
4. The quoted message can be resolved and displayed by Nostr clients that support event references

## Technical Notes

- Uses NDKEvent's `.encode()` method to get the bech32-encoded event identifier
- The `nostr:` prefix follows the NIP-19 standard for Nostr entity references
- The implementation maintains clean separation of concerns:
  - MessageActionsToolbar handles UI
  - ChatMessageList handles encoding
  - ChatInterface handles navigation/state
  - ChatInputArea handles input population