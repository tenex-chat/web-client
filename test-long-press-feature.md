# Long Press Feature Test Guide

## Feature Implementation Summary
✅ **Implemented long-press functionality for the '+' button in the project column**

### Changes Made:
1. **Added long-press detection** to the '+' button in the conversations tab
2. **Created dropdown menu** that appears on long-press with two options:
   - 📱 New Conversation
   - 📞 New Voice Call
3. **Preserved existing functionality** - regular click still creates new conversation

### How to Test:

#### Desktop (Mouse):
1. Navigate to a project column
2. Select the "Conversations" tab
3. **Short Click** on '+' button → Should create a new conversation (existing behavior)
4. **Long Press** (hold for 500ms) on '+' button → Should show dropdown with two options:
   - "New Conversation" with message icon
   - "New Voice Call" with phone icon
5. Click either option to trigger the respective action

#### Mobile/Touch Devices:
1. Same as above but using touch gestures
2. **Tap** for new conversation
3. **Long Press** for dropdown menu

### Technical Implementation:
- Uses `setTimeout` with 500ms delay for long-press detection
- Handles both mouse and touch events
- Cleans up timers on component unmount to prevent memory leaks
- Dropdown only appears for "conversations" tab (other tabs maintain original behavior)
- Voice call triggers the existing `CallView` component

### Files Modified:
- `/src/components/layout/ProjectColumn.tsx`
  - Added imports for `useRef`, `Phone` icon, and dropdown components
  - Added state for dropdown visibility
  - Implemented long-press detection logic
  - Created event handlers for mouse/touch events
  - Added dropdown menu with two options

### Test Scenarios:
1. ✅ Short click → New conversation
2. ✅ Long press (500ms) → Dropdown appears
3. ✅ Select "New Conversation" → Creates new conversation
4. ✅ Select "New Voice Call" → Opens CallView
5. ✅ Mouse leave during long press → Cancels dropdown
6. ✅ Other tabs (Docs, Agents) → Original '+' button behavior unchanged

### Notes:
- The voice call functionality uses the existing `CallView` component
- The dropdown uses the existing UI components from the design system
- Touch and mouse events are both supported for cross-platform compatibility