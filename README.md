# TENEX Web Client

A decentralized AI-assisted software development platform built on the Nostr protocol. The web client provides the primary interface for users to interact with AI agents, manage projects, and collaborate on software development tasks.

## Quick Start

### Prerequisites

- Node.js 18+ and npm/yarn/bun
- A Nostr key pair (nsec/npub)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Development

```bash
# Run tests
npm run test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run e2e tests
npm run test:e2e

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Architecture

The application is built with:
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **NDK (Nostr Dev Kit)** - Nostr protocol integration
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## Project Structure

```
src/
├── components/       # React components
│   ├── agents/      # Agent-related components
│   ├── chat/        # Chat interface components
│   ├── common/      # Shared components
│   ├── dialogs/     # Modal dialogs
│   ├── layout/      # Layout components
│   ├── mcp/         # MCP tool components
│   ├── projects/    # Project management
│   ├── settings/    # Settings components
│   └── ui/          # Base UI components
├── contexts/        # React contexts
├── events/          # Nostr event definitions
├── hooks/           # Custom React hooks
├── lib/             # Utility libraries
├── services/        # External services
├── stores/          # State management
├── types/           # TypeScript types
└── utils/           # Utility functions
```

## Key Features

- **Project Management** - Create and manage software development projects
- **AI Agent Integration** - Collaborate with specialized AI assistants
- **Real-time Communication** - Live chat with typing indicators and status updates
- **Task Management** - Create, track, and complete development tasks
- **MCP Tool Support** - Integrate external tools via Model Context Protocol
- **Documentation System** - Built-in documentation creation and management

## Documentation

For detailed documentation, see [CLIENT.md](./CLIENT.md) which includes:
- Complete feature documentation
- Event schema specifications
- User flows and workflows
- Technical architecture details

## Testing

The project includes comprehensive test coverage:
- Unit tests for utilities and hooks
- Component testing with React Testing Library
- E2E tests with Playwright

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

See LICENSE file in the root directory.