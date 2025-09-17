# Suggestion Tags Implementation

## Overview

The TENEX web interface now supports rendering "suggestion" tags from Nostr events as interactive buttons. These suggestions appear when an agent uses the `Ask` tool to present multiple-choice options to the user.

## Implementation Details

### Components Added

1. **`SuggestionButtons.tsx`**: A new component that renders suggestion tags as clickable buttons.
   - Extracts suggestion tags from Nostr events
   - Displays them in a styled container with a "Suggested responses" header
   - Handles click events to send the selected suggestion as a reply

### Components Modified

1. **`MessageContent.tsx`**: Updated to integrate the SuggestionButtons component
   - Checks for the presence of suggestion tags in events
   - Renders the SuggestionButtons component when suggestions are found
   - Implements a handler to publish the selected suggestion as a Nostr reply event (kind: 1111)

## How It Works

### Event Structure
When an agent uses the Ask tool, it creates an event with suggestion tags:

```json
{
  "kind": 1111,
  "content": "What would you like to do next?",
  "tags": [
    ["suggestion", "Option 1: Continue with the current approach"],
    ["suggestion", "Option 2: Try a different strategy"],
    ["suggestion", "Option 3: Get more information"],
    // ... other tags
  ]
}
```

### User Interaction Flow

1. The message is displayed with the question/prompt content
2. Below the message, suggestion buttons are rendered
3. When a user clicks a suggestion button:
   - A new reply event is created with the suggestion text as content
   - The event is tagged as a reply to the original question
   - The event is signed and published to Nostr
   - A success toast notification is shown

### Reply Event Structure

When a user clicks a suggestion, the following event is published:

```json
{
  "kind": 1111,
  "content": "Option 1: Continue with the current approach",
  "tags": [
    ["e", "<original_event_id>", "", "reply"],
    ["p", "<asking_agent_pubkey>"],
    ["a", "<project_tag_if_applicable>"]
  ]
}
```

Note: The reply uses `kind: 1111` (GenericReply) to maintain consistency with the TENEX messaging system.

## UI Features

- **Responsive Design**: Buttons adapt to mobile and desktop layouts
- **Visual Feedback**: Hover effects and transitions on buttons
- **Clear Labeling**: "Suggested responses" header with sparkles icon
- **Error Handling**: Toast notifications for success/failure states

## Testing

To test the implementation:

1. Have an agent send a message with suggestion tags
2. Verify the buttons appear below the message
3. Click a suggestion button
4. Confirm the reply is sent and appears in the conversation

## Future Enhancements

Potential improvements could include:
- Keyboard navigation for suggestions (arrow keys + enter)
- Customizable button styling based on suggestion type
- Analytics tracking for suggestion usage
- Ability to dismiss suggestions without selecting