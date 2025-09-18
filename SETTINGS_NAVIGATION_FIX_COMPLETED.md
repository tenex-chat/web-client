# Settings Navigation Fix - Maximum Call Stack Size Exceeded

## Problem
When navigating to the `/settings` page, the application crashed with:
```
RangeError: Maximum call stack size exceeded
```

This was happening in the TanStack Router promise resolution, indicating an infinite loop in the routing logic.

## Root Cause
The issue was caused by circular redirects in the routing structure:

1. **Problematic Routes Created:**
   - `/src/routes/_auth/settings/ai.tsx` - redirected to `/settings?tab=ai`
   - `/src/routes/_auth/settings/$.tsx` - catch-all route that redirected to `/settings`

2. **Circular Reference:**
   - When accessing `/settings`, TanStack Router would:
     - Load the main settings route
     - Try to resolve child routes
     - Child routes would redirect back to `/settings`
     - Creating an infinite loop

## Solution
Removed the problematic child routes entirely:
- Deleted `/src/routes/_auth/settings/` directory and all its contents
- The main `/settings` route already handles tab navigation via search params
- No child routes are needed for this functionality

## Files Changed
- **Deleted:** `/src/routes/_auth/settings/ai.tsx`
- **Deleted:** `/src/routes/_auth/settings/$.tsx`
- **Auto-regenerated:** `/src/routeTree.gen.ts` (by Vite/TanStack Router)

## Result
✅ Settings page now loads without errors
✅ Tab navigation works via search params (e.g., `/settings?tab=ai`)
✅ No more infinite routing loops
✅ Cleaner route structure without unnecessary redirects

## Testing
Test the fix by:
1. Navigate to `/settings` - should load the account tab
2. Navigate to `/settings?tab=ai` - should load the AI settings tab
3. Click on user menu > Settings - should navigate without errors
4. Use the tab navigation within settings - should update URL params

The routing structure is now simpler and more maintainable without the circular dependencies.