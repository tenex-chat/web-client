# TENEX web Project Specification

## 1. Overview

**TENEX web** appears to be a web-based application with a focus on real-time communication and project management features. It is built on a modern web technology stack and seems to incorporate decentralized technologies, likely the Nostr protocol.

**Note:** This document is based on initial analysis of the project's file structure. Assumptions are made where direct evidence is unavailable.

## 2. Core Functionality (Inferred)

Based on the directory structure, the application likely includes the following features:

*   **User Authentication:** A system for users to sign in and manage their accounts (`src/components/auth`).
*   **Chat:** Real-time chat functionality (`src/components/chat`). Conversations are displayed as a list of threads.
*   **Project and Task Management:** Features to create, track, and manage projects and tasks (`src/components/projects`, `src/components/tasks`). Project data is loaded via real-time subscriptions, initiated by the `initializeSubscriptions` function in the `projects` store. This process is triggered by the `useProjectSubscriptions` hook within the user interface components.
*   **Real-time Updates:** Integration with the Nostr protocol for real-time data synchronization and events (`src/lib/ndk-events`). The application uses a hook-based approach (e.g., `useProjectSubscriptions`) to manage these subscriptions.
*   **Responsive Design:** Support for both desktop and mobile devices. The application uses a responsive `CollapsibleProjectsSidebar` component to display the project list on both desktop and mobile layouts, ensuring a consistent experience across devices. It is critical to ensure that new features and fixes are applied to this component.
*   **Progressive Web App (PWA):** The application may be installable as a PWA (`src/lib/pwa`).

## 3. Technology Stack (Inferred)

*   **Frontend Framework:** A modern JavaScript framework, most likely React, given the use of components and hooks (`src/components`, `src/hooks`).
*   **Language:** TypeScript.
*   **Real-time Protocol:** Nostr, as suggested by the `ndk-events` library.
*   **State Management:** A dedicated state management library is likely used (`src/stores`).
*   **Testing:** The project includes end-to-end tests (`e2e/`).

## 4. User Interface Preferences

*   **Minimalism:** The user has expressed a preference for a clean and uncluttered user interface. Unnecessary UI elements that preface content, such as headers or counts for lists, should be avoided in favor of direct content presentation.

## 5. Assumptions

*   The project is a client-side application that interacts with a Nostr relay network.
*   The name "TENEX" may refer to a specific set of features or a larger platform.

This document will be updated as more information becomes available.
