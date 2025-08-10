Packing repository using Repomix...
Analyzing repository using gemini-2.5-flash...
The codebase exhibits several areas of concern regarding complexity, maintainability, and security. The provided `local-research` documents already highlight many of these issues, particularly related to code duplication, inconsistent state management, and critical security vulnerabilities. This analysis consolidates and expands upon these findings, offering actionable recommendations for refactoring.

### 1. Components with Too Many Responsibilities (God Components)

**Analysis:**
Several components and stores are burdened with excessive responsibilities, leading to high coupling, reduced readability, and increased difficulty in testing and maintenance.

*   **`src/components/chat/ChatInterface.tsx`**:
    *   **Responsibilities**: Handles message input, sending messages (text, image, voice), image preview, drag-and-drop, real-time streaming responses, markdown rendering, code highlighting, agent mentions, auto-TTS playback, keyboard height adjustments, file uploads, and integration with numerous hooks (`useBlossomUpload`, `useMentionAutocomplete`, `useMurfTTS`, `useKeyboardHeight`, `useStreamingResponses`, `useIsMobile`).
    *   **Impact**: This component is a central hub for a disproportionate amount of application logic, making it hard to understand, debug, and extend. Changes in one area risk unintended side effects in others.
    *   **Recommendation**:
        *   **Extract `ChatInputArea`**: Create a dedicated component for the message input, file attachment, voice recording button, and send button. This component would manage its own state (input text, pending files) and expose callbacks for sending.
        *   **Extract `MessageList`**: Create a component solely responsible for rendering the `messages` array, possibly incorporating `VirtualList` for performance (see Section 4). This component would receive `messages` and callbacks for actions (e.g., `onReply`, `onTaskClick`).
        *   **Delegate Business Logic**: Move complex logic like `handleSendMessage`'s branching (new thread vs. reply) and image/mention processing into dedicated hooks or utility functions that the `ChatInputArea` then calls.
        *   **Refactor `useEffect` hooks**: Break down the large `useEffect` that processes messages into smaller, more focused effects, possibly using `useReducer` if state transitions become complex.

*   **`src/components/dialogs/VoiceDialog.tsx`**:
    *   **Responsibilities**: Manages the entire voice message lifecycle including audio recording (MediaRecorder, AudioContext, waveform visualization), speech-to-text transcription (via `useSpeechToText`), text cleanup (via `useLLM`), audio file upload (to Blossom), and Nostr NIP-94 event publishing.
    *   **Impact**: Similar to `ChatInterface`, this dialog encapsulates too many distinct operations. Its internal state management is complex, and the coupling to multiple external services and APIs makes it difficult to test in isolation.
    *   **Recommendation**:
        *   **Extract Custom Hooks**: Create a `useAudioRecorder` hook (managing MediaRecorder, audio stream, waveform), a `useTranscriptionService` hook (handling Whisper API), and a `useAudioUploader` hook (for Blossom upload and NIP-94 event creation).
        *   **Simplify Dialog Logic**: The `VoiceDialog` would then orchestrate these simpler hooks, focusing purely on the UI flow and state transitions between recording, processing, and editing.

*   **`src/stores/projects.ts`**:
    *   **Responsibilities**: Manages project data (`projects`, `threads`, `projectStatus`), global NDK subscriptions (`initializeSubscriptions`, `initializeStatusSubscription`), complex event processing logic (`updateProjectStatus`), and interactions with other Zustand stores (`useAgentsStore`, `useProjectActivityStore`).
    *   **Impact**: Violates the principle of separation of concerns; a state management store should primarily manage state, not be responsible for data fetching, subscription management, or complex side effects. This makes the store large, tightly coupled to NDK, and hard to test.
    *   **Recommendation**:
        *   **Extract NDK Data Layer**: Create a dedicated service or set of hooks (e.g., `useNDKProjectSync`, `useNDKStatusSync`) that handle all NDK subscriptions, event parsing, and data normalization.
        *   **Simplify Project Store**: The `projects` store should then become a simpler Zustand/Jotai store that *receives* and *stores* this normalized data, acting purely as a cache or view model for UI components. Its actions should be limited to `addProject`, `removeProject`, `setProjects`, etc., triggered by the data layer.

### 2. Functions with High Cyclomatic Complexity

**Analysis:**
Functions with many branches (`if/else`, `switch`, loops) are harder to understand, test, and debug.

*   **`src/components/chat/ChatInterface.tsx` - `useEffect` for messages processing**:
    *   **Complexity**: This `useEffect` (lines 159-204) processes `currentThreadEvent`, `threadReplies`, `relatedTasks`, and `streamingResponses`, sorts them, and updates the `messages` state. It has multiple conditional checks and data transformations.
    *   **Recommendation**: Break this down into smaller, memoized functions or `useMemo` calls for each data source (e.g., `useMemoizedThreadMessages`, `useMemoizedTaskMessages`, `useMemoizedStreamingMessages`). Combine these results into the final `messages` array, possibly using `useReducer` if the state updates become intricate.
*   **`src/services/blossom/BlossomService.ts` - `uploadFile` method (lines 101-209)**:
    *   **Complexity**: Handles file validation, optional image compression, metadata generation, SHA-256 hashing, server selection, actual file upload (with progress and abort signals), and retries.
    *   **Recommendation**:
        *   **Extract `validateFile` logic**: Create a standalone utility function or a dedicated `FileValidationService` for reuse and testability.
        *   **Extract `generateFileMetadata`**: This is already a separate private method, which is good.
        *   **Simplify upload flow**: `uploadFile` should orchestrate calls to these utilities and the `NDKBlossom` client, rather than containing all the implementation details directly. The retry logic could also be extracted into a higher-order function or a dedicated retry utility.
*   **`src/services/blossom/BlossomServerRegistry.ts` - `selectBestServer` method (lines 148-167)**:
    *   **Complexity**: Contains a sorting algorithm with multiple criteria (availability, success rate, priority, latency).
    *   **Recommendation**: While the logic is encapsulated, ensuring each sorting criterion is clearly defined and potentially extracted into a small helper function can improve readability. The current implementation is reasonably clear, but complex sorting logic is always a candidate for review.

### 3. Dead Code and Unused Exports

**Analysis:**
The codebase contains unused files and functions that add to bundle size and cognitive load.

*   **`src/hooks/use-mobile.tsx`**:
    *   **Issue**: This hook (`useIsMobile`) is duplicated by `src/hooks/useMediaQuery.ts`, which already provides a more generalized solution. This was explicitly flagged in `local-research/code-duplication-analysis.md`.
    *   **Recommendation**: Remove `src/hooks/use-mobile.tsx` entirely. Ensure all consumers use `useIsMobile` from `src/hooks/useMediaQuery.ts`.
*   **`src/stores/llm.ts`**:
    *   **Issue**: This file defines `LLMConfig` and `TTSConfig` atoms, but `src/stores/llmConfig.ts` contains more up-to-date and comprehensive definitions for very similar concepts, causing conflict and redundancy. This was flagged in `local-research/code-duplication-analysis.md` and `local-research/state-management-analysis.md`.
    *   **Recommendation**: Remove `src/stores/llm.ts`. Consolidate all LLM and TTS configuration into `src/stores/llmConfig.ts` as the single source of truth. Update all consumers to use the types and atoms from `llmConfig.ts`.
*   **`src/lib/ndk-setup.ts` - `createNDK` function**:
    *   **Issue**: The `createNDK` function is not actively used. The NDK instance is created directly within `src/routes/__root.tsx` via `NDKHeadless`. This was flagged in `local-research/code-duplication-analysis.md`.
    *   **Recommendation**: If the custom event registration or other logic within `createNDK` is necessary, refactor `src/routes/__root.tsx` to explicitly use this utility. Otherwise, remove `src/lib/ndk-setup.ts` to reduce unused code.
*   **`src/components/upload/UploadProgress.tsx`**:
    *   **Issue**: This component seems to overlap significantly in functionality with `src/components/upload/ImageUploadQueue.tsx`. Both display upload progress, but `ImageUploadQueue` is used globally and `UploadProgress` is conditionally rendered.
    *   **Recommendation**: Consolidate `UploadProgress` into `ImageUploadQueue` or ensure `UploadProgress` is a highly generic, reusable progress display component that `ImageUploadQueue` composes. The `ImageUploadQueue` currently handles its own logic and UI, making `UploadProgress` potentially redundant.

### 4. Circular Dependencies

**Analysis:**
Circular dependencies create tightly coupled modules, making refactoring difficult and potentially leading to unexpected runtime behavior or build issues.

*   **`src/stores/projects.ts` <-> `src/hooks/useProjectsWithStatus.ts`**:
    *   **Issue**: `src/stores/projects.ts` explicitly exports `useProjectsWithStatus` as a selector hook (line 536), while `src/hooks/useProjectsWithStatus.ts` defines and exports a hook of the same name. This looks like a naming conflict or a refactoring artifact. The `local-research/code-duplication-analysis.md` also flags this, recommending better NDK subscription filters.
    *   **Recommendation**: Clarify which `useProjectsWithStatus` is authoritative. Given the analysis that `src/stores/projects.ts` has too many responsibilities, the NDK subscription logic should ideally be moved *out* of the store and into a dedicated hook (perhaps the one in `src/hooks`). The store should then simply provide access to the raw `projects` array, and the hook (e.g., `useProjectsWithLiveStatus`) would combine `projects` data with live status updates.
*   **`src/services/blossom/BlossomService.ts` <-> `src/services/blossom/BlossomServerRegistry.ts` <-> `src/stores/blossomStore.ts` <-> `src/hooks/useBlossomUpload.ts`**:
    *   **Issue**:
        *   `BlossomService` contains `selectServer` with `defaultServers` (lines 61-94) but `BlossomServerRegistry` is designed for this exact purpose (`selectBestServer` line 148). `BlossomService` *should* consume `BlossomServerRegistry`, but it also duplicates logic.
        *   `useBlossomUpload` depends on `BlossomService` and `BlossomServerRegistry` directly, and also updates `blossomStore` atoms.
        *   `blossomStore` defines types like `UploadQueueItem` and `BlossomServer` but these are also defined in `BlossomUploadManager` and `BlossomService` respectively, creating type definition duplication (as noted in `code-duplication-analysis.md`).
    *   **Impact**: Tightly coupled services and stores that are difficult to isolate and test. Inconsistent logic can arise if both `BlossomService` and `BlossomServerRegistry` manage server lists independently.
    *   **Recommendation**:
        *   **Centralize Server Management**: Remove all server-related logic (e.g., `defaultServers`, `selectServer`) from `BlossomService.ts`. `BlossomService` should *always* delegate server selection to `BlossomServerRegistry.getInstance().selectBestServer()`.
        *   **Consolidate Types**: Move `UploadQueueItem` to a central `src/types` or `src/stores/blossomStore.ts` as the canonical definition. Similarly, consolidate `BlossomServer` and `BlossomServerInfo` into one `BlossomServerInfo` in `BlossomServerRegistry.ts`.
        *   **Refine `useBlossomUpload`**: The hook should orchestrate calls to `BlossomService` and `BlossomServerRegistry`, and interact with `blossomStore` atoms for UI state. The core upload logic remains in `BlossomService`.
*   **`src/hooks/useMurfTTS.ts` <-> `src/services/murfTTS.ts` <-> `src/hooks/useMurfVoices.ts` <-> `src/services/murfVoicesCache.ts`**:
    *   **Issue**: `useMurfTTS` contains `fetchMurfVoices` (lines 163-179), but `MurfTTSService` also has a `getVoices()` method (lines 216-231) that does the same thing. `useMurfVoices` then calls the `fetchMurfVoices` from `useMurfTTS`. This is redundant and convoluted.
    *   **Recommendation**:
        *   **Centralize Voice Fetching**: Move the `fetchMurfVoices` function directly into `src/services/murfTTS.ts` as a public static method or a standalone utility.
        *   **Streamline Hooks**: `useMurfVoices` should then call this single source for voice fetching, interacting with `MurfVoicesCache`. `useMurfTTS` should focus purely on the TTS playback logic.

### 5. Missing Error Handling

**Analysis:**
While `ErrorBoundary` is present, specific user-facing error feedback is sometimes missing or inconsistent, especially for network operations or external API calls. The critical API key exposure means direct client-side calls will always carry security risks, but user-facing errors still need to be handled gracefully.

*   **API Key Exposure**:
    *   **Issue**: `issues/critical-api-key-security-vulnerability.md` explicitly points out that API keys (OpenAI, Murf.ai) are exposed via `import.meta.env.VITE_OPENAI_API_KEY` in `src/hooks/useSpeechToText.ts` (line 5), `src/hooks/useLLM.ts` (line 6), and stored in `localStorage` in `src/stores/llm.ts` (lines 20-27) and `src/stores/llmConfig.ts` (lines 50-51).
    *   **Impact**: This is a severe security vulnerability, not just a "missing error handling" but an architectural flaw. Any error handling built on top of this insecure foundation is insufficient.
    *   **Recommendation**: **Critical**. Implement a secure backend proxy. All API key-sensitive operations must be moved to a backend service. The client should only call secure backend endpoints. This changes the nature of error handling, as the client would then handle errors from the proxy, not direct API errors.
*   **Inconsistent User Feedback for Network Errors**:
    *   `src/hooks/useSpeechToText.ts` (line 29): `toast.error("Failed to transcribe audio")` is present, which is good.
    *   `src/hooks/useLLM.ts` (lines 35-37): `console.error` for text cleanup, but falls back to basic cleanup without a user-facing toast.
    *   `src/services/blossom/BlossomService.ts` (lines 191-200): `onError?.(err)` callback is used, but a generic `toast.error('Upload failed')` is not always guaranteed unless the caller handles it.
    *   `src/components/settings/TTSSettings.tsx` (`playTestAudio` function, line 236 onwards): Extensive `try...catch` blocks and `toast.error` calls, which is good.
    *   **Recommendation**: Ensure consistent user feedback (e.g., `toast.error`) for *all* network-related errors, especially those interacting with external services (LLMs, TTS, Blossom). For background operations, a `console.error` might suffice, but for user-initiated actions, direct feedback is crucial.

### 6. Hardcoded Values that Should Be Constants or Config

**Analysis:**
Magic numbers and directly embedded values reduce flexibility and make global changes difficult.

*   **Timeouts and Durations**:
    *   `src/hooks/useTypingIndicator.ts` (line 74): `5000` (5 seconds) for typing indicator timeout.
    *   `src/services/blossom/BlossomServerRegistry.ts` (lines 40, 41): `60000` (1 minute) for health check interval, `5000` (5 seconds) for latency check timeout.
    *   `src/hooks/useProjectsWithStatus.ts` (line 28): `600` (10 minutes) for `since` filter on project status.
    *   `src/stores/blossomStore.ts` (lines 98, 116): `3` for `maxRetries`.
    *   `src/hooks/useDraftPersistence.ts` (line 94): `7 * 24 * 60 * 60 * 1000` (7 days) for draft cleanup.
    *   **Recommendation**: Define these as named constants in `src/lib/constants.ts` or as configurable settings in a store (e.g., `ui.ts` for UI-related timeouts, `llmConfig.ts` for LLM/TTS related).
*   **File Upload Limits**:
    *   `src/hooks/useBlossomUpload.ts` (line 194): `100 * 1024 * 1024` (100MB) for max file size.
    *   `src/services/blossom/BlossomService.ts` (lines 98, 99): `10 * 1024 * 1024` (10MB) default max upload size, `2 * 1024 * 1024` (2MB) compression threshold.
    *   **Recommendation**: Centralize these limits (e.g., in `src/services/blossom/BlossomService.ts` if they are service-specific or in `src/stores/blossomStore.ts` if user-configurable via settings). The max file size in `useBlossomUpload` validation (100MB) clashes with the `BlossomService` internal `maxUploadSize` (10MB). This is an inconsistency that needs resolution.
*   **Concurrency Limits**:
    *   `src/hooks/useBlossomUpload.ts` (line 116): `3` for max concurrent uploads.
    *   **Recommendation**: Make this configurable, potentially via `BlossomSettings` or a global constant.

### 7. Missing Tests for Critical Paths

**Analysis:**
`MILESTONES.md` and `CLEANUP_SUMMARY.md` explicitly state that test coverage needs improvement, particularly for critical paths. While some unit and e2e tests exist, there are identified gaps.

*   **`src/components/chat/ChatInterface.tsx`**:
    *   **Issue**: This component is central to user interaction, but its tests (`ChatInterface.test.tsx`) are basic, mostly verifying element rendering and simple input. Complex interactions like `handleSendMessage`'s logic for threading, image attachments, streaming responses, and mention handling are not thoroughly covered. The integration with `useBlossomUpload`, `useMentionAutocomplete`, `useMurfTTS`, `useKeyboardHeight`, and `useStreamingResponses` also requires robust testing.
    *   **Recommendation**: Implement comprehensive unit and integration tests covering:
        *   Sending messages in new and existing threads, with/without mentions.
        *   Sending messages with image attachments, including different upload statuses (pending, uploading, completed, failed).
        *   Behavior of `streamingResponses` and their replacement by final messages.
        *   Interaction with `useMurfTTS` for auto-playback.
        *   Keyboard shortcuts and input area resizing.
        *   Error states during message sending or file upload.
*   **`src/components/dialogs/VoiceDialog.tsx`**:
    *   **Issue**: This complex component has no dedicated tests, despite integrating with multiple browser APIs (MediaRecorder, AudioContext) and external services (Whisper, Blossom).
    *   **Recommendation**: Implement a dedicated test suite for `VoiceDialog` covering:
        *   Start, stop, and re-record functionality.
        *   Transcription process (mocking `useSpeechToText` and `useLLM`).
        *   Audio upload (mocking Blossom integration).
        *   Waveform visualization (can be tested for data generation, not visual rendering).
        *   Editing transcription and final submission.
        *   Error handling for recording, transcription, and upload.
*   **`src/stores/projects.ts`**:
    *   **Issue**: As a "God store," this store's complex logic (`initializeSubscriptions`, `updateProjectStatus`) is difficult to test via UI, necessitating dedicated unit tests.
    *   **Recommendation**: Write unit tests for all actions and selectors in `src/stores/projects.ts`. Focus on:
        *   Correctly adding, removing, and setting projects.
        *   How `updateProjectStatus` processes incoming `NDKProjectStatus` events and updates project arrays and `projectStatus` maps.
        *   Interaction with `useAgentsStore` and `useProjectActivityStore`.
        *   Lifecycle of NDK subscriptions (mocking `ndk.subscribe` and its event emitters).
*   **NDK Event Classes (`src/lib/ndk-events/`)**:
    *   **Issue**: While `NDKProject.test.ts` exists, the other custom event classes (e.g., `NDKAgentDefinition`, `NDKAgentLesson`, `NDKMCPTool`, `NDKProjectStatus`, `NDKTask`) have limited or no dedicated tests.
    *   **Recommendation**: Create comprehensive unit tests for each custom NDK event class to ensure:
        *   Correct `kind` assignment.
        *   Proper getter/setter functionality for tags and content.
        *   Correct generation of derived properties (e.g., `dTag` for `NDKProject`, `projectId` for `NDKProjectStatus`).
        *   Accurate implementation of NDK-specific methods like `nip22Filter` or `delete`.

### Actionable Refactoring Recommendations Summary:

1.  **Decompose God Components**: Break `ChatInterface`, `VoiceDialog`, and `projects` store into smaller, single-responsibility components/hooks/services.
2.  **Extract Complex Logic**: Move large `useEffect` blocks or multi-branch functions into dedicated, testable utility functions or custom hooks.
3.  **Eliminate Dead Code and Duplication**: Remove `use-mobile.tsx`, `llm.ts`, and consolidate `UploadProgress` where possible.
4.  **Resolve Circular Dependencies**:
    *   Centralize server management in `BlossomServerRegistry`.
    *   Centralize Murf voice fetching.
    *   Review `useProjectsWithStatus` for clearer separation from `projects` store.
    *   Consolidate duplicated types into a single source of truth.
5.  **Implement Secure Backend for API Keys**: This is the most critical and non-negotiable step to address the severe security vulnerability.
6.  **Standardize Error Feedback**: Ensure all critical operations provide consistent user-facing `toast.error` messages.
7.  **Externalize Hardcoded Values**: Promote magic numbers and important configuration values to named constants or configurable settings.
8.  **Increase Test Coverage**: Prioritize writing robust unit and integration tests for all decomposed components, hooks, stores, and NDK event classes, especially those identified as critical paths.

By addressing these points, the codebase will become significantly more modular, testable, maintainable, and secure.

---

**Files most relevant to the user's query:**

*   `local-research/code-duplication-analysis.md`
*   `local-research/security-performance-audit.md`
*   `local-research/state-management-analysis.md`
*   `issues/critical-api-key-security-vulnerability.md`
*   `issues/high-performance-bottlenecks.md`
*   `issues/medium-architectural-inconsistencies.md`
*   `src/components/chat/ChatInterface.tsx`
*   `src/components/dialogs/VoiceDialog.tsx`
*   `src/stores/projects.ts`
*   `src/services/blossom/BlossomService.ts`
*   `src/services/blossom/BlossomServerRegistry.ts`
*   `src/stores/blossomStore.ts`
*   `src/hooks/useBlossomUpload.ts`
*   `src/hooks/use-mobile.tsx`
*   `src/hooks/useMediaQuery.ts`
*   `src/stores/llm.ts`
*   `src/stores/llmConfig.ts`
*   `src/lib/ndk-setup.ts`
*   `src/hooks/useMurfTTS.ts`
*   `src/services/murfTTS.ts`
*   `src/hooks/useMurfVoices.ts`
*   `src/components/upload/ImageUploadQueue.tsx`
*   `src/components/upload/UploadProgress.tsx`
*   `src/hooks/useSpeechToText.ts`
*   `src/hooks/useLLM.ts`
*   `src/hooks/useTypingIndicator.ts`
*   `src/hooks/useProjectsWithStatus.ts`
*   `src/lib/constants.ts`
*   `src/components/projects/ProjectCard.test.tsx`
*   `src/components/chat/ChatInterface.test.tsx`
*   `src/lib/ndk-events/NDKAgentDefinition.ts`
*   `src/lib/ndk-events/NDKAgentLesson.ts`
*   `src/lib/ndk-events/NDKMCPTool.ts`
*   `src/lib/ndk-events/NDKProject.test.ts`
*   `src/lib/ndk-events/NDKProject.ts`
*   `src/lib/ndk-events/NDKProjectStatus.ts`
*   `src/lib/ndk-events/NDKTask.ts`
*   `src/lib/voice-config.ts`
*   `src/routes/__root.tsx`