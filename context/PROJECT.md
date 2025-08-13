# TENEX web Project Specification

## 1. Overview

**TENEX web** appears to be a web-based application with a focus on real-time communication and project management features. It is built on a modern web technology stack and seems to incorporate decentralized technologies, likely the Nostr protocol.

**Note:** This document is based on initial analysis of the project's file structure. Assumptions are made where direct evidence is unavailable.

## 2. Core Functionality (Inferred)

Based on the directory structure, the application likely includes the following features:

*   **User Authentication:** A system for users to sign in and manage their accounts (`src/components/auth`).
*   **Chat:** Real-time chat functionality (`src/components/chat`). Conversations are displayed as a list of threads. Each conversation in the list displays an indicator for the current phase of the conversation, derived from `kind:1111` events.
*   **Project and Task Management:** Features to create, track, and manage projects and tasks (`src/components/projects`, `src/components/tasks`). Project data is loaded via real-time subscriptions, initiated by the `initializeSubscriptions` function in the `projects` store. This process is triggered by the `useProjectSubscriptions` hook within the user interface components.
*   **New Feature: Start Project on Offline Click**
    *   When a project is offline, clicking the offline indicator next to its title will now trigger the "start project" action.
    *   This action involves sending a Nostr event of kind `24000` to the backend, which tags the respective project.
    *   This functionality has been implemented in the `ProjectStatusIndicator` component and handled in the project detail page and mobile view.
    *   Toast notifications are displayed for success and error handling.
*   **Real-time Updates:** Integration with the Nostr protocol for real-time data synchronization and events (`src/lib/ndk-events`). The application uses a hook-based approach (e.g., `useProjectSubscriptions`) to manage these subscriptions.
*   **Agent Definition Rendering**: Support for rendering NDKAgentDefinition events (kind:4199) in content. This includes:
    *   A new component, `AgentDefinitionEmbedCard`, which displays agent name, role, description, use criteria, and author.
    *   The ability to open a modal for viewing full agent details and installing the agent.
    *   Installation is achieved by adding an "agent" tag with the NCKAgentDefinition event ID to the project.
    *   Reusability of existing components (e.g., `NostrEntityCard`) for consistent rendering.
*   **Responsive Design:** Support for both desktop and mobile devices. The application uses a responsive `CollapsibleProjectsSidebar` component to display the project list on both desktop and mobile layouts, ensuring a consistent experience across devices. It is critical to ensure that new features and fixes are applied to this component.
*   **Progressive Web App (PWA):** The application may be installable as a PWA (`src/lib/pwa`).

## 3. Technology Stack (Inferred)

*   **Frontend Framework:** A modern JavaScript framework, most likely React, given the use of components and hooks (`src/components`, `src/hooks`).
*   **Language:** TypeScript.
*   **Real-time Protocol:** Nostr, as suggested by the `ndk-events` library.
*   **State Management:** A dedicated state management library is likely used (`src/stores`).
*   **Testing:** The project includes end-to-end tests (`e2e/`).
*   **Blossom Protocol:** Identified as a protocol for media storage, which will influence how media assets are handled within the application.

## 4. User Interface Preferences

*   **Minimalism:** The user has expressed a preference for a clean and uncluttered user interface. Unnecessary UI elements that preface content, such as headers or counts for lists, should be avoided in favor of direct content presentation.
*   **Efficient Use of Space:** The user prefers layouts that make efficient use of screen real estate. For instance, removing unnecessary padding around elements to give content more room to breathe.
*   **Subtle Phase Indicators:** The user has a strong preference for subtle UI elements. Instead of text-based indicators, the phase of a conversation should be represented by a small, 5x5px colored circle.
    *   The color of the circle must correspond to the phase color used in the main conversation view.
    *   A tooltip (using the `title` attribute) should display the name of the phase on hover.
    *   This indicator must be implemented as a reusable component to ensure consistency across the application.
*   **Deterministic Project Avatars:** Project avatars must have a deterministic fallback color generated from the project's "d" tag (NIP-33 identifier). This ensures a consistent color for each project across all sessions and views. This is implemented in the reusable `ProjectAvatar` component. If a project has a custom image for its logo, the background color should not be visible once the image loads.

## 5. Assumptions

*   The project is a client-side application that interacts with a Nostr relay network.
*   The name "TENEX" may refer to a specific set of features or a larger platform.
*   **Note on Event Publishing:** An issue was encountered during the `complete()` call (Nostr publishing error), indicating potential problems with event propagation that need further investigation by the Executor or relevant team.

This document will be updated as more information becomes available.