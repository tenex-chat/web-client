Packing repository using Repomix...
Analyzing repository using gemini-2.5-flash...
The codebase exhibits several areas of code duplication and technical debt across various dimensions. Below is a detailed analysis focusing on the requested aspects, with specific examples and file locations.

### 1. Duplicate Code Patterns Across Components

*   **Search Bar Implementations:**
    *   The `SearchBar.tsx` component exists for reusable search input.
    *   However, `src/components/mobile/MobileProjectsList.tsx` and `src/components/agents/AgentsPage.tsx` implement their own search input UI using `<Input>` and a `<Search>` icon, duplicating the layout and basic functionality of `SearchBar`.
    *   **Example:**
        *   `src/components/mobile/MobileProjectsList.tsx`:
            ```tsx
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search projects..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10"/>
            </div>
            ```
        *   `src/components/agents/AgentsPage.tsx`:
            ```tsx
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search agents by name, description, or role..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10"/>
            </div>
            ```
    *   **Recommendation:** Refactor these instances to consistently use the `SearchBar` component.

*   **File Validation Logic:**
    *   File validation logic, particularly for image types and sizes, is duplicated.
    *   `src/hooks/useBlossomUpload.ts` includes a `validateFiles` function.
    *   `src/services/blossom/BlossomService.ts` also contains `validateFile` and internal checks within `compressImage` (e.g., `isImage`).
    *   **Example:**
        *   `src/hooks/useBlossomUpload.ts` (`validateFiles`):
            ```typescript
            if (file.size > 100 * 1024 * 1024) { /* ... */ }
            if (!file.type.startsWith('image/')) { /* ... */ }
            ```
        *   `src/services/blossom/BlossomService.ts` (`validateFile`):
            ```typescript
            if (file.size > this.maxUploadSize) { /* ... */ }
            if (this.isImage(file) && !this.supportedImageTypes.includes(file.type)) { /* ... */ }
            ```
    *   **Recommendation:** Centralize file validation logic, perhaps within the `BlossomService` or a dedicated `FileValidation` utility, and have `useBlossomUpload` depend on it.

*   **Mobile Detection Hook:**
    *   The `useIsMobile` hook is defined in two different files.
    *   `src/hooks/use-mobile.tsx` and `src/hooks/useMediaQuery.ts` both export `useIsMobile`.
    *   **Recommendation:** Remove `src/hooks/use-mobile.tsx` and ensure all components import `useIsMobile` from `src/hooks/useMediaQuery.ts`, which already provides a more generalized media query functionality.

### 2. Inconsistent State Management Patterns

*   **Zustand vs. Jotai:**
    *   The codebase explicitly uses two different state management libraries, leading to increased complexity and cognitive load for developers.
    *   **Zustand** is used for:
        *   `src/stores/projects.ts` (`useProjectsStore`, `useProjectStatus`)
        *   `src/stores/agents.ts` (`useAgentsStore`, `useGlobalAgents`)
        *   `src/stores/projectActivity.ts` (`useProjectActivityStore`)
    *   **Jotai** is used for:
        *   `src/stores/llm.ts` (`llmConfigAtom`, `ttsConfigAtom`)
        *   `src/stores/llmConfig.ts` (`llmConfigAtom`, `ttsConfigAtom` - note the conflict with `llm.ts`)
        *   `src/stores/ui.ts` (`sidebarCollapsedAtom`, `themeAtom`)
        *   `src/stores/blossomStore.ts` (all upload-related atoms)
    *   **Impact:** This inconsistency makes the codebase harder to reason about, increases bundle size, and complicates feature development and debugging.
    *   **Recommendation:** Choose a single state management library (e.g., consolidate entirely to Jotai, as it's used for critical AI/upload features and has strong React integration) and migrate all stores to it.

### 3. Redundant Service Implementations

*   **Blossom Server Selection:**
    *   `src/services/blossom/BlossomService.ts` contains its own `defaultServers` list and a `selectServer` method.
    *   `src/services/blossom/BlossomServerRegistry.ts` is explicitly designed to manage multiple Blossom servers, perform health checks, and select the best one.
    *   **Redundancy:** `BlossomService` should *not* maintain its own server list or selection logic. It should delegate server selection entirely to `BlossomServerRegistry`. The current implementation in `useBlossomUpload.ts` already correctly uses `registry.selectBestServer`, but `BlossomService.ts` still has redundant internal logic.
    *   **Example:**
        *   `src/services/blossom/BlossomService.ts` `selectServer` method:
            ```typescript
            async selectServer(fileSize: number): Promise<BlossomServer | null> {
              // ... filters defaultServers, for now returns first suitable
            }
            ```
        *   This should ideally just call `BlossomServerRegistry.getInstance().selectBestServer()`.
    *   **Recommendation:** Remove `defaultServers` and `selectServer` from `BlossomService.ts` and ensure it exclusively uses `BlossomServerRegistry` for server-related concerns.

*   **Murf Voice Fetching:**
    *   The function `fetchMurfVoices` is defined and exported in `src/hooks/useMurfTTS.ts`.
    *   `src/services/murfTTS.ts` (the class that `useMurfTTS` wraps) also has a `getVoices()` method that performs the exact same API call.
    *   **Redundancy:** The standalone `fetchMurfVoices` function is redundant.
    *   **Recommendation:** `useMurfVoices` should call the `getVoices` method from `MurfTTSService.getInstance()` directly instead of relying on a duplicated helper function.

*   **NDK Initialization:**
    *   `src/lib/ndk-setup.ts` provides a `createNDK` function to initialize an NDK instance.
    *   `src/routes/__root.tsx` directly initializes `NDKHeadless` with NDK configuration.
    *   **Redundancy:** The `NDKHeadless` component in the root layout is the correct and idiomatic way to initialize and provide NDK to `@nostr-dev-kit/ndk-hooks`. The `createNDK` function in `ndk-setup.ts` appears unused and redundant in this context.
    *   **Recommendation:** Remove `src/lib/ndk-setup.ts` or consolidate its logic (e.g., `registerEventClass` calls) directly into `src/routes/__root.tsx` where NDK is instantiated.

### 4. Type Definition Duplication

*   **Upload Queue Item Types:**
    *   `UploadQueueItem` is defined in `src/stores/blossomStore.ts`.
    *   `UploadTask` is defined in `src/services/blossom/BlossomUploadManager.ts`.
    *   **Duplication:** These two interfaces represent almost the same concept (an item in the upload queue) but have slight differences in properties and type annotations (e.g., `error` as `string` vs `Error`, presence of `abortController`, `thumbnail`, `timestamp`).
    *   **Recommendation:** Consolidate these into a single, canonical `UploadQueueItem` interface in a shared `types` directory or the `blossomStore` and use it consistently.

*   **Blossom Server Types:**
    *   `BlossomServer` is defined in `src/services/blossom/BlossomService.ts`.
    *   `BlossomServerInfo` is defined in `src/services/blossom/BlossomServerRegistry.ts`.
    *   **Duplication:** `BlossomServerInfo` is a more comprehensive type, including metrics and capabilities. `BlossomService` uses the simpler `BlossomServer` type internally for its `defaultServers` list.
    *   **Recommendation:** Use `BlossomServerInfo` as the single source of truth for server definitions. `BlossomService` should adapt to this type by obtaining server information from `BlossomServerRegistry`.

*   **LLM and TTS Configuration Types:**
    *   `src/stores/llm.ts` contains `LLMConfig` and `TTSConfig`.
    *   `src/stores/llmConfig.ts` contains `LLMConfig` (a different structure) and `TTSConfig` (a more detailed version).
    *   **Inconsistency/Duplication:** This is a severe inconsistency. There are conflicting and outdated definitions for core configuration types. `src/stores/llmConfig.ts` seems to hold the more current and complete definitions, especially for TTS.
    *   **Recommendation:** Remove `src/stores/llm.ts` entirely and ensure `src/stores/llmConfig.ts` is the single, authoritative source for all LLM and TTS configuration types. Update all consumers accordingly.

### 5. Hook Implementation Patterns That Could Be Consolidated

*   **Drag and Drop Logic:**
    *   `src/hooks/useDragAndDrop.ts` provides a generic, reusable hook for drag-and-drop interactions.
    *   `src/hooks/useBlossomUpload.ts` implements its own `handleDragEnter`, `handleDragLeave`, `handleDragOver`, and `handleDrop` functions, duplicating the core logic of `useDragAndDrop`.
    *   **Recommendation:** `useBlossomUpload` should compose `useDragAndDrop` to inherit the basic drag-and-drop functionality, making its implementation cleaner and more focused on the upload-specific aspects.

### 6. Architectural Inconsistencies

*   **Contradictory NDK Wrapper Guidelines:**
    *   `FEATURE_INVENTORY.md` states: "NEVER create wrapper types around NDK - Use NDK types directly."
    *   However, the codebase extensively uses custom classes like `NDKProject`, `NDKAgentDefinition`, `NDKMCPTool`, `NDKTask`, and `NDKProjectStatus`, which extend `NDKEvent`.
    *   **Analysis:** While this is a direct contradiction, extending `NDKEvent` with custom classes is a common and often beneficial pattern in NDK development, allowing for type-safe access to custom event tags and encapsulating event-specific logic. The guideline might be outdated or misinterpreted.
    *   **Recommendation:** Clarify this guideline. If the current approach of extending `NDKEvent` is intentional and considered good practice (which it often is), update `FEATURE_INVENTORY.md` to reflect this.

*   **Insecure API Key Storage:**
    *   `issues/critical-api-key-security-vulnerability.md` explicitly details this critical flaw.
    *   API keys (e.g., OpenAI, Murf.ai) are directly exposed in the client-side JavaScript bundle via `import.meta.env.VITE_...` and/or stored unencrypted in `localStorage` (`src/stores/llmConfig.ts`, `src/stores/llm.ts`).
    *   **Impact:** This is a severe security vulnerability that allows unauthorized access and abuse of third-party services.
    *   **Recommendation:** This requires a fundamental architectural shift. Implement a secure backend proxy service to handle all API key-sensitive interactions, ensuring keys are never exposed to the client.

*   **Ignored TypeScript Errors:**
    *   `tsconfig.json` sets `"skipLibCheck": true`.
    *   `MILESTONES.md` and `CLEANUP_SUMMARY.md` acknowledge that numerous TypeScript errors still exist (e.g., "33 TypeScript errors remaining").
    *   **Impact:** This compromises type safety, reduces developer confidence, and can lead to runtime errors that should have been caught during compilation.
    *   **Recommendation:** Remove `skipLibCheck: true` and prioritize fixing all remaining TypeScript errors to ensure a robust and maintainable codebase.

*   **Inefficient NDK Subscriptions & Unbounded Cache Growth:**
    *   `issues/high-performance-bottlenecks.md` details these performance-related architectural issues.
    *   `src/hooks/useProjectsWithStatus.ts` fetches "ALL status events in last 10 minutes" and filters client-side, instead of relying on relay-side filtering with multiple `#a` tags.
    *   `src/lib/ndk-setup.ts` (and by extension, the `NDKCacheDexie` setup in `src/routes/__root.tsx`) has "no explicit eviction policy," leading to unbounded local database growth.
    *   **Impact:** These lead to poor performance, high memory consumption, and a degraded user experience, especially as data scales.
    *   **Recommendation:** Implement more granular subscription filters, pagination, and consider cache eviction policies (TTL, max size) for `NDKCacheDexie`.

### 7. Areas with High Complexity That Need Refactoring

*   **`src/components/chat/ChatInterface.tsx`:**
    *   **Complexity:** This component is a central hub for many features: message input/sending, markdown rendering, image attachments, drag-and-drop, voice messages (recording, transcription, playback), mentions, real-time streaming responses, integration with multiple hooks (`useBlossomUpload`, `useMentionAutocomplete`, `useMurfTTS`, `useKeyboardHeight`, `useStreamingResponses`), and message list processing.
    *   **Responsibility Overload:** It handles UI display, user interaction, data fetching, data transformation, and integration with several external services/hooks.
    *   **Refactoring Ideas:** Extract sub-components (e.g., `ChatInputArea`, `MessageList`) and custom hooks to delegate specific responsibilities. The `MessageList` could also incorporate virtualization for performance.

*   **`src/components/dialogs/VoiceDialog.tsx`:**
    *   **Complexity:** Manages the entire voice message workflow: audio recording (low-level MediaRecorder, AudioContext, waveform visualization), transcription via an external API, text cleanup via another API, audio file upload, and NIP-94 event publishing. It also includes editing functionality.
    *   **Refactoring Ideas:** Break down the logic into smaller, focused hooks or utility classes: e.g., `useAudioRecorder` (for recording and waveform), `useTranscriptionService` (for Whisper API), `useAudioUploader` (for Blossom upload and NIP-94 event creation).

*   **`src/stores/projects.ts`:**
    *   **Complexity:** This Zustand store manages `projects`, `threads`, and `projectStatus` data. Critically, it also directly manages complex NDK subscriptions (`initializeSubscriptions`, `initializeStatusSubscription`) and event processing logic (`updateProjectStatus`) internally. It also interacts with other Zustand stores (`useAgentsStore`, `useProjectActivityStore`).
    *   **Violation of Separation of Concerns:** A state management store should primarily manage state, not actively manage data subscriptions or complex event processing that involves direct NDK interaction and side effects. This makes the store large, tightly coupled, and harder to test in isolation.
    *   **Refactoring Ideas:** Extract the NDK subscription and event processing logic from the store's actions into dedicated React hooks (e.g., `useProjectDataSync`) or a separate NDK data layer. The store should then simply receive and update data provided by these external mechanisms.

The most relevant files for this analysis include:
*   `issues/critical-api-key-security-vulnerability.md`
*   `issues/high-performance-bottlenecks.md`
*   `issues/medium-architectural-inconsistencies.md`
*   `CLEANUP_SUMMARY.md`
*   `FEATURE_INVENTORY.md`
*   `MILESTONES.md`
*   `src/components/chat/ChatInterface.tsx`
*   `src/components/dialogs/VoiceDialog.tsx`
*   `src/components/mobile/MobileProjectsList.tsx`
*   `src/components/agents/AgentsPage.tsx`
*   `src/hooks/use-mobile.tsx`
*   `src/hooks/useMediaQuery.ts`
*   `src/hooks/useBlossomUpload.ts`
*   `src/hooks/useDragAndDrop.ts`
*   `src/hooks/useMurfTTS.ts`
*   `src/hooks/useMurfVoices.ts`
*   `src/hooks/useLLM.ts`
*   `src/hooks/useSpeechToText.ts`
*   `src/lib/ndk-events/NDKProject.ts`
*   `src/lib/ndk-setup.ts`
*   `src/routes/__root.tsx`
*   `src/services/blossom/BlossomService.ts`
*   `src/services/blossom/BlossomServerRegistry.ts`
*   `src/services/blossom/BlossomUploadManager.ts`
*   `src/services/murfTTS.ts`
*   `src/stores/agents.ts`
*   `src/stores/blossomStore.ts`
*   `src/stores/llm.ts`
*   `src/stores/llmConfig.ts`
*   `src/stores/projects.ts`
*   `tsconfig.json`