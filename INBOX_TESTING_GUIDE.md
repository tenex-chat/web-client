# Inbox Testing Guide

## Overview
The inbox feature has been enhanced with improved visual indicators, animations, and project associations. This guide provides instructions for testing all aspects of the inbox functionality.

## Quick Start Testing
1. Navigate to the Inbox page (click "Inbox" in the sidebar or go to `/inbox`)
2. Look for the **yellow "Development Test Mode"** panel at the top
3. Click the **"Load Test Data"** button to populate the inbox with mock events
4. The inbox will now show several test events with various features

## Key Features to Test

### 1. Project Name Display
- **What to Look For:** Events should display "in project 📁 [Project Name]" badges
- **How to Test:** 
  - After loading test data, you should see events with project badges like:
    - "in project 📁 Auth System v2"
    - "in project 📁 Frontend Redesign"
    - "in project 📁 Performance Audit"
  - Hover over any project badge to see a tooltip with project details
  - Click on a project badge to navigate to that project

### 2. "New" Indicator (Unread Messages)
Unread messages have THREE visual indicators:

#### A. Blue Glowing Bar (Left Side)
- **Location:** Left edge of unread message cards
- **Appearance:** Bright blue vertical bar with an animated glow effect
- **Animation:** Continuous pulsing glow that expands and contracts
- **How to Test:** Look for messages marked as "New" - they will have this glowing blue bar

#### B. "New" Badge
- **Location:** In the message header, next to the event type
- **Appearance:** Blue rounded badge with white "New" text
- **Animation:** Pulsing scale and shadow effect (grows slightly larger/smaller)
- **How to Test:** Look for the animated "New" badges on recent messages

#### C. Light Blue Background
- **Appearance:** Unread messages have a subtle light blue background tint
- **How to Test:** Compare unread vs read messages - unread ones have a blue-tinted background

### 3. Sidebar Inbox Badge
- **Location:** Sidebar "Inbox" button (near the bottom)
- **Appearance:** Red circular badge with unread count
- **Animation:** Pulsing glow effect with red shadow
- **How to Test:** 
  - With test data loaded, check the sidebar
  - You should see a red badge with a number (e.g., "3")
  - The badge should have a pulsing animation

## Testing Dynamic Elements

### Animations to Observe
1. **Blue Bar Glow Animation**
   - Duration: 2.5 seconds per cycle
   - Effect: Expanding/contracting blue glow shadow
   - Best viewed: Against a light background

2. **"New" Badge Pulse**
   - Duration: 2 seconds per cycle
   - Effect: Scale and shadow pulse
   - The badge grows slightly and the shadow expands

3. **Sidebar Badge Animation**
   - Duration: 2 seconds per cycle
   - Effect: Red glow pulse with shadow
   - Visible even when sidebar is collapsed

### Interaction Testing
1. **Mark as Read:**
   - Navigate to another page (e.g., Projects)
   - Return to Inbox
   - Previously "New" messages should now appear as read (no blue bar/badge)

2. **Hover States:**
   - Hover over message cards to see hover highlight
   - Hover over project badges to see tooltips
   - Hover over "View Context" button to see hover state

3. **Click Actions:**
   - Click on a message to expand/navigate
   - Click on project badges to go to project
   - Click "View Context" to see related conversation

## Troubleshooting

### If You Don't See Mock Data:
1. Make sure you're logged in (check for user avatar in sidebar)
2. Click "Load Test Data" button in the yellow test panel
3. Check browser console for any errors

### If Animations Aren't Visible:
1. Check that you have "Reduce motion" disabled in your OS accessibility settings
2. Try refreshing the page after loading test data
3. The animations are more visible in light mode

### If Project Names Don't Appear:
1. Click "Load Test Data" to ensure mock projects are created
2. Check that events have the project badge format: "in project 📁 [Name]"
3. Hover over badges to confirm tooltips work

## Expected Test Results
After loading test data, you should see:
- 6 inbox events total
- 3 unread events (with blue bar and "New" badge)
- 3 older read events (no special styling)
- All events should have project associations
- Sidebar should show unread count badge with animation
- All hover states and tooltips should work

## Development Notes
- Test mode is only available in development environment
- Mock data is stored in memory and will reset on page refresh
- Use "Clear Test Data" button to reset and test the empty state