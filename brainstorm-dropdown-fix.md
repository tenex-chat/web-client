# Brainstorm Mode Dropdown Fix

## Issue
The dropdown was closing immediately when selecting a moderator, preventing users from:
1. Seeing the moderator selection register
2. Selecting participants in the next step
3. The button label wasn't updating to show the selected moderator

## Root Cause
The `DropdownMenuItem` component by default closes the dropdown when clicked. This was preventing the two-step workflow from functioning properly.

## Solution

### Key Changes Made:

1. **Prevented Auto-Close on Selection**
   - Added `onSelect={(e) => e.preventDefault()}` to moderator selection items
   - This prevents the dropdown from closing while still allowing the click handler to work

2. **Kept Dropdown Open for Participants**
   - Added `onSelect={(e) => e.preventDefault()}` to checkbox items
   - Allows multiple participant selections without closing

3. **Improved State Management**
   - Added `handleOpenChange` function to initialize session when first opened
   - Session starts automatically when dropdown opens for the first time
   - Button label updates reactively based on moderator selection

4. **Added Debug Logging**
   - Console logs show state changes for debugging
   - Helps verify that selections are being registered

## How It Works Now

1. **Click "Brainstorm Mode"** 
   - Creates a new session
   - Opens dropdown showing agent list

2. **Select Moderator**
   - Click registers the selection
   - Dropdown stays open
   - Button label updates to "Brainstorm Mode (AgentName)"
   - View transitions to participant selection

3. **Select Participants** (Optional)
   - Check/uncheck agents as participants
   - Dropdown remains open for multiple selections

4. **Clear or Close**
   - Use "Clear Brainstorm Mode" to reset
   - Or click outside to close dropdown with selections saved

## Testing the Fix

1. Open browser console to see debug logs
2. Click "Brainstorm Mode" button
3. Select a moderator - verify:
   - Dropdown stays open
   - Button label updates
   - Console shows state change
4. Select participants - verify checkboxes work
5. Close and reopen - verify selections persist

## Files Modified

- `/src/components/chat/components/BrainstormModeButton.tsx`
  - Added `onSelect` event prevention
  - Added `handleOpenChange` for session initialization
  - Added debug logging with `useEffect`
  - Improved dropdown content management