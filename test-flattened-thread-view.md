# Flattened Thread View Implementation

## Summary
Successfully implemented a toggle to switch between threaded and flattened view modes in the chat interface. In flattened view, all events with uppercase `E` tags pointing to the conversation root are displayed chronologically without threading.

## Changes Made

### 1. Created Thread View Mode Store
- **File:** `src/stores/thread-view-mode-store.ts`
- Manages the view mode state ('threaded' or 'flattened')
- Default mode is 'threaded'

### 2. Created Thread View Toggle Component
- **File:** `src/components/chat/components/ThreadViewToggle.tsx`
- Toggle button with icons (Layers for threaded, List for flattened)
- Includes tooltip for better UX
- Follows the pattern of existing toggle buttons

### 3. Modified useChatMessages Hook
- **File:** `src/components/chat/hooks/useChatMessages.ts`
- Added `viewMode` parameter
- Passes view mode to message processor

### 4. Updated Message Processor
- **File:** `src/components/chat/utils/messageProcessor.ts`
- Added `viewMode` parameter to `processEventsToMessages`
- Added `hasUppercaseETag` helper function
- In flattened mode: includes all events with uppercase E tags pointing to root
- In threaded mode: maintains existing behavior (only direct replies)

### 5. Updated ChatHeader Component
- **File:** `src/components/chat/components/ChatHeader.tsx`
- Added ThreadViewToggle button next to conversation controls
- Only visible when there's an active conversation with messages

### 6. Updated ChatInterface Component
- **File:** `src/components/chat/ChatInterface.tsx`
- Imports and uses the thread view mode store
- Passes view mode to `useChatMessages` hook

### 7. Updated ChatMessageList Component
- **File:** `src/components/chat/components/ChatMessageList.tsx`
- Conditionally renders MessageThread component only in threaded mode
- In flattened mode, messages appear without threading UI

## Testing Instructions

1. Open the app at http://localhost:3004/
2. Navigate to a conversation with nested replies
3. Look for the new toggle button in the chat header (near the copy and other controls)
4. Click the toggle to switch between:
   - **Threaded View** (default): Shows only direct replies with threading UI
   - **Flattened View**: Shows all events with uppercase E tags chronologically

## Key Features

- **Persistent State**: View mode persists during the session
- **Clean Transitions**: Smooth switching between modes
- **No Performance Impact**: Uses existing NDK subscriptions
- **Follows NIP-22**: Properly handles uppercase E tags for conversation roots
- **Consistent UX**: Toggle design matches existing UI patterns

## Technical Notes

- The implementation leverages existing NDK subscription and caching mechanisms
- Filtering happens at the message processor level, not at subscription level
- All existing chat functionalities (TTS, replies, etc.) remain functional in both modes
- The toggle is only shown when there's an active conversation with messages