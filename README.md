# TENEX TanStack Version

Complete migration of TENEX web client to TanStack Router with Telegram-style responsive UI.

## Quick Start

```bash
# Install dependencies
bun install

# Run development server
bun run dev

# Run tests
bun test                    # Unit tests
bun run test:e2e           # E2E tests with Playwright
bun run test:e2e:install   # Install Playwright browsers

# Build for production
bun run build

# Type checking
bun run typecheck

# Code formatting
npx prettier --write "src/**/*.{ts,tsx}"
```

## Project Structure

```
tanstack-version/
├── src/
│   ├── routes/            # TanStack Router routes
│   ├── components/        # React components
│   ├── lib/              # Utilities and helpers
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # State management (Jotai)
│   ├── styles/           # CSS and themes
│   └── test/             # Test utilities
├── e2e/                  # Playwright E2E tests
├── public/               # Static assets
├── MILESTONES.md         # Living milestone document
└── FEATURE_INVENTORY.md  # Complete feature reference
```

## Key Documents

- **[MILESTONES.md](./MILESTONES.md)** - Living document tracking implementation progress
- **[FEATURE_INVENTORY.md](./FEATURE_INVENTORY.md)** - Complete reference of all features to implement

## Testing Strategy

### Unit Tests (Vitest)
```bash
bun test                   # Run all tests
bun test:ui               # Open Vitest UI
bun test:coverage         # Generate coverage report
```

### E2E Tests (Playwright)
```bash
bun run test:e2e          # Run all E2E tests
bun run test:e2e:ui       # Open Playwright UI
```

### MCP Integration Testing
```bash
# Use vibe-tools MCP to run complex test scenarios
vibe-tools mcp run "test authentication flow in ./tanstack-version" --provider=anthropic
```

## Development Workflow

1. **Check current milestone** in MILESTONES.md
2. **Run tests** to verify current state
3. **Implement features** following FEATURE_INVENTORY.md
4. **Write tests** for new features
5. **Update milestone document** with progress

## Architecture Decisions

- **TanStack Router** for type-safe routing
- **Telegram-style UI** with responsive design
- **NDK** for Nostr protocol integration
- **Jotai** for atomic state management
- **Tailwind CSS v4** for styling
- **shadcn/ui** for component library
- **Bun** as package manager and runtime

## Nostr Integration

The app connects to Nostr relays and uses NDK for:
- Event publishing and subscription
- Private key management
- Custom event types (Projects, Agents, Tasks, etc.)
- Real-time updates via WebSocket

## Environment Variables

Create a `.env` file:
```env
# Test Nostr key for E2E tests
TEST_NSEC=nsec1...

# API Keys (optional)
OPENAI_API_KEY=sk-...
MURF_API_KEY=...
```

## Contributing

1. Read MILESTONES.md for current status
2. Follow patterns in FEATURE_INVENTORY.md
3. Write tests for all features
4. Update documentation as you work

---

This project was created using `bun init` in bun v1.2.16. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.