# TENEX Embeddable Widget

An embeddable chat widget that allows users to communicate with TENEX project agents via Nostr from any website.

## Features

- 🎨 **Floating Chat Button** - Unobtrusive button in the bottom-right corner
- 🔐 **Nostr Authentication** - Sign in with your nsec key
- 💬 **Real-time Messaging** - Send and receive messages via Nostr protocol
- 📜 **Message History** - View past conversations
- 🌙 **Dark Mode Support** - Automatically adapts to system preferences
- 📱 **Responsive Design** - Works on all screen sizes

## How to Embed

Add this single line of code to your website, just before the closing `</body>` tag:

```html
<script
  src="https://tenex.app/widget.js"
  data-project-id="naddr1..."
  defer
></script>
```

Replace `naddr1...` with your actual TENEX project's NIP-19 address (naddr).

## Configuration

### Required Attributes

- `data-project-id`: The NIP-19 naddr of your TENEX project

### Example

```html
<!DOCTYPE html>
<html>
<head>
    <title>My App</title>
</head>
<body>
    <h1>My Application</h1>
    
    <!-- Your app content -->
    
    <!-- TENEX Widget -->
    <script 
        src="https://tenex.app/widget.js" 
        data-project-id="naddr1qqs8vamkyetxv9ejuargv5s8yetwwdhkx6t8dej8xct5wvhxxmmdq3qq5wv6kxvj5wwfkxymj5xgz8xyct5x4z8setwwd3kzcewd3skgerydpc8g6tfdenjqmrvdakzqct8d4jk2dnjdqcnydpnv3sk2cm4xymnwup5xezxgtrsd5kxmr9v4jkgumexs5xcef49"
        defer>
    </script>
</body>
</html>
```

## User Experience

1. **Floating Button**: A blue chat button appears in the bottom-right corner
2. **Authentication**: Users click the button and enter their Nostr nsec key
3. **Messaging**: Once authenticated, users can send messages and view history
4. **Persistence**: The nsec is stored in localStorage for the session
5. **Real-time**: Messages are published to Nostr relays (relay.damus.io, relay.primal.net)

## Technical Details

### Architecture

The widget is a standalone React application that:
- Reads the `data-project-id` attribute from its script tag
- Creates its own DOM container with isolated styles
- Uses NDK (Nostr Development Kit) for Nostr communication
- Publishes `kind:1` notes tagged with user pubkey and project ID

### Message Format

Messages are published as `kind:1` Nostr events with:
- **Content**: User's message
- **Tags**:
  - `p` tag: User's public key
  - `a` tag: Project's naddr

### Relays

The widget connects to these default relays:
- `wss://relay.damus.io`
- `wss://relay.primal.net`

## Development

### File Structure

```
src/widget/
├── index.tsx           # Entry point - reads script tag and initializes
├── Widget.tsx          # Main component - floating button and state
├── ChatWindow.tsx      # Chat UI - authentication and messaging
├── useNostr.ts         # Nostr hook - NDK integration and messaging logic
└── README.md           # This file
```

### Building

The widget is built as a separate bundle:

```bash
npm run build
```

This generates `dist/widget.js` which can be embedded on any website.

### Testing Locally

Open `widget-demo.html` in your browser to see the widget in action:

```bash
open widget-demo.html
```

### Customization

The widget uses Tailwind CSS classes and supports both light and dark modes automatically. To customize colors, modify the classes in `Widget.tsx` and `ChatWindow.tsx`.

## Browser Support

- Chrome/Edge: ✅ Latest 2 versions
- Firefox: ✅ Latest 2 versions
- Safari: ✅ Latest 2 versions
- Mobile browsers: ✅ iOS Safari, Chrome Mobile

## Privacy & Security

- **nsec Storage**: Stored in localStorage (user's browser only)
- **No Backend**: All communication is peer-to-peer via Nostr
- **Isolated Styles**: Widget styles don't affect host page
- **No Tracking**: No analytics or tracking code

## Troubleshooting

### Widget not appearing?
- Check browser console for errors
- Verify `data-project-id` is set correctly
- Ensure the script URL is accessible

### Can't authenticate?
- Verify your nsec is valid (starts with `nsec1`)
- Check browser console for NDK errors
- Try a different browser

### Messages not sending?
- Check internet connection
- Verify Nostr relays are accessible
- Try signing out and back in

## License

Part of the TENEX project.