# TENEX web Project Specification

## 1. Overview

TENEX web is a web-based application focused on real-time communication and project management. It is explicitly designed with decentralized technology (notably, Nostr protocol) at its core.

This document only outlines what the project IS and what we've inferred, explicitly separating user-confirmed facts from assumptions. Technical implementation details like technology stack, code, and architecture do NOT belong in this file. This living document is updated as new, explicit information becomes available about product requirements or user goals.

## 2. Confirmed Functionality

The following features and goals have been **explicitly confirmed by user requests or requirements**:

- **User Authentication:** System for account sign-in/management.
- **Chat & Conversations:**
  - Real-time chat with conversations displayed as a list of threads.
  - Each thread displays a visual indicator for the current phase—requires a **small, subtle 5x5px colored circle** matching the phase color in the conversation view (not text), as a reusable component. Tooltip shows the phase name on hover. No unnecessary headers or list counts.
  - **Message Rendering with Bech32 Support:** When rendering messages, any bare bech32 string (like `npub1...`, `nevent1...`, etc.) is automatically treated as if it had the `nostr:` prefix and rendered as an interactive nostr entity card. This allows seamless recognition of nostr identifiers without requiring explicit prefixing.
  - **Agent Mentions in Chat:** When mentioning agents in chat input using `@agent-name` format, the system automatically replaces the mention with the agent's full `nostr:npub...` identifier when the message is sent. This ensures proper nostr protocol integration and enables agent notifications.
- **Project and Task Management:**
  - Projects/tasks can be created and tracked.
  - Project data is updated live using Nostr-powered real-time subscriptions. The system uses a hook-based approach to manage these subscriptions, starting from components.
  - **When a project is offline**, clicking its offline indicator triggers the "start project" action (implemented as Nostr event `kind:24000` and project tagging, plus success/error toast notifications). This is handled in both desktop and mobile components, specifically via the ProjectStatusIndicator.
- **Agent Definition Management:**
  - Supports NDKAgentDefinition events (kind:4199).
  - Uses a reusable embed card to display agent details; a modal allows full agent inspection and installation (adds "agent" tag with agent event ID to project tags). Reuses core rendering components.
  - **Agent Definition Forking:** When forking an existing Agent Definition, the system creates a new replaceable event with proper Nostr protocol compliance:
    - Adds an "e" tag referencing the original agent definition being forked from (for lineage tracking)
    - Includes a "d" tag with the agent's slug (for NIP-33 replaceable event identification)
    - Preserves the original agent's slug to maintain identity continuity across versions
    - Automatically increments version number when forking
    - Provides UI fields for managing slug and other agent properties
- **Responsive Design:**
  - Layout adapts to both desktop and mobile devices. 
  - The "CollapsibleProjectsSidebar" is critical for project list visibility and must be consistent across devices.
  - All new features/fixes must ensure mobile and desktop parity.
- **User Experience/UI Preferences:**
  - Minimalist and uncluttered interface—avoid superfluous headings, counts, or content prefaces; prioritize direct content.
  - Layouts must efficiently use available screen space (minimize padding, maximize content area).
- **Project Avatars:**
  - Each project gets a deterministic fallback color for its avatar, derived from the "d" tag (NIP-33 id). Once a custom image loads, the background should not show.

## 3. Assumptions (Inferred Only)

The following details are **inferred** from file structure/code, and should NOT be considered authoritative unless directly confirmed:

- The project appears to use React (or a similar component-based frontend) and TypeScript.
- Project state management is likely handled with a state management library.
- End-to-end tests exist.
- Blossom Protocol is present and likely used for media storage.
- The project is installable as a Progressive Web App (PWA).
- "TENEX" may refer to a larger platform or suite.
- The project is a client-side application that interacts with the Nostr relay network.

## 4. Evolution and Issues

- **Nostr Event Publishing:** Noted issue when using complete()—possible event propagation problem requires further engineering investigation.
- This document is updated as new, explicit information becomes available or user requirements evolve.

---

This specification ONLY includes: (a) features and goals directly stated/confirmed by the user or task outcomes, and (b) inferred details which are clearly delineated as such.