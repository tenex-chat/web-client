# Test Plan for CallView Thread Fix

## Issue
When clicking the phone call icon in an existing conversation, CallView was creating a new thread instead of using the existing conversation.

## Root Cause
CallView wasn't receiving the actual `rootEvent` (the current conversation thread), only the `extraTags` with the thread ID. This caused it to initialize with `localRootEvent` as null and create a new thread on the first voice message.

## Fix Applied
1. **Updated CallView Component** (`src/components/call/CallView.tsx`)
   - Added `rootEvent?: NDKEvent | null` to CallViewProps interface
   - Initialize `localRootEvent` state with passed `rootEvent` prop
   - Pass `rootEvent` to `useThreadManagement` hook as initialRootEvent

2. **Updated all CallView invocations to pass rootEvent**:
   - `src/components/layout/ProjectColumn.tsx` (3 locations) - passes `selectedThread`
   - `src/components/layout/MultiProjectView.tsx` - passes `selectedThreadEvent`
   - `src/routes/_auth/projects/$projectId/index.tsx` - passes `selectedThreadEvent`
   - `src/components/windows/FloatingWindow.tsx` - passes `content.data?.rootEvent`

3. **Updated floating window call content data**:
   - Added `rootEvent` to call window data in project route
   - Added `rootEvent` and `extraTags` to call window data in MultiProjectView

## Test Cases

### Test Case 1: Start call from existing conversation
**Steps:**
1. Open an existing conversation
2. Click the phone call icon in the chat header
3. Speak in the call view

**Expected Result:** 
- Voice messages should be added to the existing thread
- No new thread should be created
- All messages (text and voice) appear in the same conversation

### Test Case 2: Start call from project view (no active conversation)
**Steps:**
1. Be in the project view without any selected conversation
2. Start a voice call using the call button
3. Speak in the call view

**Expected Result:**
- A new thread should be created as before
- Voice messages go into this new thread

### Test Case 3: Start call from floating window with active conversation
**Steps:**
1. Open a conversation in a floating window (desktop only)
2. Click the phone call icon
3. Speak in the call view

**Expected Result:**
- Should use the existing conversation context
- Voice messages added to the same thread

### Test Case 4: Verify thread continuity
**Steps:**
1. Start a text conversation
2. Switch to voice call
3. Send some voice messages
4. Close the call
5. Continue with text messages

**Expected Result:**
- All messages (text and voice) should appear in the same thread chronologically
- No conversation fragmentation

## Implementation Details

The key change was ensuring that when CallView receives an existing `rootEvent`:
- It doesn't create a new thread on the first message
- Instead, it sends replies to the existing thread using `threadManagement.sendReply()`
- The conversation context is preserved across text/voice mode switches

## Benefits
✅ Maintains conversation context when switching between text and voice
✅ Prevents fragmentation of conversations  
✅ Better user experience with seamless mode switching
✅ Preserves conversation history and context for agents