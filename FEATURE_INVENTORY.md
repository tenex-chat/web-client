# TENEX Feature Inventory - Complete Reference

## Critical Implementation Details

### 1. Nostr Event System

#### Event Kinds Reference
```typescript
// Standard Nostr Events
export const EVENT_KINDS = {
  METADATA: 0,           // User profile
  CONTACT_LIST: 3,       // Follow list
  CHAT: 11,             // Simple chat message
  THREAD_REPLY: 1111,   // Thread replies
  GENERIC_REPLY: 1111,  // Generic replies
  
  // TENEX Custom Events
  TASK: 1934,                    // Task management
  AGENT_REQUEST: 3199,           // Agent access request
  AGENT_REQUEST_LIST: 13199,     // List of approved agents
  AGENT_LESSON: 4129,            // Agent training data
  AGENT_CONFIG: 4199,            // Agent configuration
  MCP_TOOL: 4200,               // MCP tool definition
  PROJECT: 31933,               // Project definition
  ARTICLE: 30023,               // Documentation article
  TEMPLATE: 30717,              // Project template
  
  // Status & Real-time Events  
  PROJECT_STATUS: 24010,         // Project online status
  LLM_CONFIG_CHANGE: 24101,      // LLM config update
  TYPING_INDICATOR: 24111,       // User typing
  TYPING_INDICATOR_STOP: 24112,  // Stop typing
  STREAMING_RESPONSE: 21111,     // Streaming AI response
} as const
```

#### Tagging System Implementation
```typescript
// CRITICAL: How tags work in TENEX

// 1. Agent Tags - Reference agents in projects/messages
["agent", agentPubkey, agentName]

// 2. Model Tags - LLM configuration
["model", modelName, configName]

// 3. Template Tags - Project templates
["template", templateEventId]

// 4. MCP Tool Tags - Tool references
["mcp", toolEventId]

// 5. Rule Tags - Agent instructions
["rule", instructionId, ...agentNames]

// 6. Thread Tags (NIP-10 compliant)
["e", eventId, relayUrl, "root"]    // Root of thread
["e", eventId, relayUrl, "reply"]   // Direct reply to
["p", pubkey]                        // Mentioned user/agent

// 7. Claude Session Tags - For routing
["claude-session", sessionId]

// 8. Status Tags
["status", "online" | "offline" | "busy"]
["last-seen", timestamp]
```

### 2. Reply System - CRITICAL Implementation

```typescript
// MUST use NDK's .reply() method exactly like this:

// For thread replies:
const replyEvent = currentThreadEvent.reply()
replyEvent.content = messageContent
replyEvent.tags.push(...mentionedAgentTags) // Add p-tags for agents
await replyEvent.publish()

// For task replies:
const taskReply = task.reply()
taskReply.content = updateContent
taskReply.tags.push(["claude-session", sessionId]) // For routing
await taskReply.publish()

// NEVER manually construct e-tags or root tags
// NDK's .reply() handles all threading correctly
```

### 3. LLM Metadata System

```typescript
interface LLMMetadata {
  provider: 'openai' | 'anthropic' | 'google' | 'local'
  model: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  systemPrompt?: string
}

// Stored in events as:
event.tags.push(["llm", JSON.stringify(metadata)])

// Retrieved from events:
const llmTag = event.tags.find(t => t[0] === "llm")
const metadata = llmTag ? JSON.parse(llmTag[1]) : null
```

### 4. Project Creation Flow - Multi-Step Process

```typescript
// Step 1: Basic Info
interface ProjectBasicInfo {
  name: string          // Required
  description: string   // Required
  tags: string[]       // Hashtags for discovery
  imageUrl?: string    // Project avatar
  repoUrl?: string     // GitHub/GitLab URL
}

// Step 2: Template Selection
interface TemplateSelection {
  templateId?: string  // Event ID of template
}

// Step 3: Agent Selection
interface AgentSelection {
  agents: Array<{
    pubkey: string
    name: string
    selected: boolean
  }>
}

// Step 4: MCP Tools
interface MCPToolSelection {
  tools: Array<{
    eventId: string
    name: string
    selected: boolean
  }>
}

// Step 5: Instructions
interface InstructionConfig {
  rules: Array<{
    id: string
    content: string
    agentNames: string[] // Which agents follow this rule
  }>
}

// Final: Create NDKProject event with all tags
const project = new NDKProject(ndk)
project.title = basicInfo.name
project.content = basicInfo.description
project.tags.push(
  ...agents.map(a => ["agent", a.pubkey, a.name]),
  ...tools.map(t => ["mcp", t.eventId]),
  ...rules.map(r => ["rule", r.id, ...r.agentNames]),
  ["template", templateId]
)
await project.publish()
```

### 5. Chat Interface - Message Composition

```typescript
// @Mention Autocomplete System
const useMentionAutocomplete = (input: string, cursorPosition: number) => {
  // 1. Detect @ symbol before cursor
  const beforeCursor = input.slice(0, cursorPosition)
  const atIndex = beforeCursor.lastIndexOf('@')
  
  // 2. Extract partial name
  const partialName = beforeCursor.slice(atIndex + 1)
  
  // 3. Filter agents by partial match
  const matches = agents.filter(a => 
    a.name.toLowerCase().includes(partialName.toLowerCase())
  )
  
  // 4. On selection, replace @partial with @AgentName
  // 5. Add p-tag for selected agent
  return { matches, replaceRange: [atIndex, cursorPosition] }
}

// Message sending with mentions
const sendMessage = async (content: string, mentionedAgents: Agent[]) => {
  const event = currentThread.reply()
  event.content = content
  
  // Add p-tags for all mentioned agents
  mentionedAgents.forEach(agent => {
    event.tags.push(["p", agent.pubkey])
  })
  
  await event.publish()
}
```

### 6. Voice Message System

```typescript
// Voice Recording Flow
interface VoiceMessage {
  // 1. Record audio using MediaRecorder API
  // 2. Generate waveform data during recording
  // 3. Upload to Blossom server
  // 4. Create NIP-94 audio event
  
  audioUrl: string        // Blossom URL
  duration: number        // Seconds
  waveform: number[]      // Normalized amplitudes
  transcription?: string  // From Whisper API
}

// NIP-94 Audio Event
const audioEvent = new NDKEvent(ndk)
audioEvent.kind = 1111 // Reply in thread
audioEvent.content = transcription || "Voice message"
audioEvent.tags = [
  ["url", blossomUrl],
  ["m", "audio/webm"],
  ["duration", duration.toString()],
  ["waveform", JSON.stringify(waveform)],
  ...threadingTags
]
```

### 7. Typing Indicators - Real-time System

```typescript
// Send typing indicator
const sendTypingIndicator = async (threadId: string) => {
  const event = new NDKEvent(ndk)
  event.kind = 24111 // TYPING_INDICATOR
  event.content = ""
  event.tags = [["e", threadId]]
  await event.publish()
  
  // Auto-stop after 5 seconds
  setTimeout(async () => {
    const stopEvent = new NDKEvent(ndk)
    stopEvent.kind = 24112 // TYPING_INDICATOR_STOP
    stopEvent.content = ""
    stopEvent.tags = [["e", threadId]]
    await stopEvent.publish()
  }, 5000)
}

// Subscribe to indicators
const subscription = ndk.subscribe({
  kinds: [24111, 24112],
  "#e": [threadId]
})
```

### 8. Task Management System

```typescript
// Task Creation
const task = new NDKTask(ndk)
task.title = "Implement feature X"
task.content = "Detailed description..."
task.status = "pending"
task.tags = [
  ["project", projectId],
  ["assigned", agentPubkey],
  ["priority", "high"]
]

// Status Updates (as replies)
const update = task.reply()
update.kind = 24010 // PROJECT_STATUS
update.content = JSON.stringify({
  status: "in-progress",
  progress: 50,
  note: "Working on implementation"
})
```

### 9. Agent System Details

```typescript
// Agent Configuration (kind 4199)
interface NDKAgent {
  name: string
  description: string
  role: string // "assistant" | "developer" | "researcher" etc
  instructions: string // System prompt
  useCriteria: string[] // When to use this agent
  
  // Methods
  toEvent(): NDKEvent
  publish(): Promise<void>
}

// Agent Lessons (kind 4129)
interface AgentLesson {
  content: string      // The lesson
  reasoning: string    // Why this lesson matters
  agentPubkey: string // Which agent
  timestamp: number
  
  // Metacognition: Agent reflects on its learning
  reflection?: string
}

// Agent Request Flow
// 1. User requests access to agent
const request = new NDKEvent(ndk)
request.kind = 3199 // AGENT_REQUEST
request.tags = [["p", agentPubkey]]

// 2. Agent owner approves
const approvalList = new NDKEvent(ndk)
approvalList.kind = 13199 // AGENT_REQUEST_LIST
approvalList.tags = [
  ["p", approvedUserPubkey1],
  ["p", approvedUserPubkey2]
]
```

### 10. MCP Tools Integration

```typescript
interface MCPTool {
  name: string
  description: string
  command: string // CLI command to execute
  parameters: Record<string, any>
  capabilities: string[]
  
  // In events:
  kind: 4200
  tags: [
    ["name", name],
    ["command", command],
    ["capability", ...capabilities]
  ]
}
```

### 11. SQLite WASM Cache

```typescript
// Cache configuration
const cache = new NDKCacheDexie({
  dbName: 'tenex-cache',
  // Cache these event kinds locally
  eventKinds: [
    0,     // Metadata
    3,     // Contacts
    1111,  // Replies
    31933, // Projects
    4199,  // Agents
    // ... other kinds
  ]
})

// Initialize NDK with cache
const ndk = new NDK({
  explicitRelayUrls: [...relays],
  cacheAdapter: cache
})
```

### 12. Navigation Context System

```typescript
// Custom navigation functions wrapping TanStack Router
const useNavigation = () => {
  const navigate = useNavigate()
  
  return {
    goToProject: (id: string) => navigate({
      to: '/projects/$projectId',
      params: { projectId: id }
    }),
    
    goToThread: (projectId: string, threadId: string) => navigate({
      to: '/projects/$projectId/thread/$threadId',
      params: { projectId, threadId }
    }),
    
    goToTask: (projectId: string, taskId: string) => navigate({
      to: '/projects/$projectId/task/$taskId',
      params: { projectId, taskId }
    }),
    
    // Mobile: Different navigation behavior
    goBack: () => {
      if (isMobile) navigate({ to: '..' })
      else updatePanelSelection()
    }
  }
}
```

### 13. Real-time Subscriptions

```typescript
// Project status subscription pattern
const subscribeToProjectStatus = (projectId: string) => {
  return ndk.subscribe({
    kinds: [24010], // PROJECT_STATUS
    "#project": [projectId],
    since: Math.floor(Date.now() / 1000) - 3600 // Last hour
  }, {
    closeOnEose: false, // Keep subscription open
    groupable: true
  })
}

// Message subscription with threading
const subscribeToThread = (threadId: string) => {
  return ndk.subscribe({
    kinds: [1111], // THREAD_REPLY
    "#e": [threadId],
    "#root": [threadId] // Include all nested replies
  })
}
```

### 14. Draft Management

```typescript
// Using Jotai for draft persistence
const messageDraftsAtom = atom<Map<string, string>>(new Map())

// Save draft on input change
const saveDraft = (threadId: string, content: string) => {
  setDrafts(prev => new Map(prev).set(threadId, content))
  // Also persist to localStorage
  localStorage.setItem(`draft-${threadId}`, content)
}

// Restore draft on mount
const draft = drafts.get(threadId) || 
  localStorage.getItem(`draft-${threadId}`) || ''
```

### 15. Theme System

```typescript
// Theme stored in Jotai atom and localStorage
const themeAtom = atom<'light' | 'dark'>(
  localStorage.getItem('theme') || 'light'
)

// Apply theme class to document
useEffect(() => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}, [theme])
```

## UI Component Patterns

### Telegram-Style Project Cards
```typescript
<ProjectCard>
  <Avatar>{project.picture || initials}</Avatar>
  <div>
    <Title>{project.title}</Title>
    <LastMessage>{lastActivity}</LastMessage>
    <UnreadBadge count={unread} />
  </div>
  <Timestamp>{relativeTime}</Timestamp>
</ProjectCard>
```

### Swipeable Mobile Views
```typescript
<SwipeableView
  onSwipeRight={() => openSidebar()}
  onSwipeLeft={() => closeSidebar()}
>
  {children}
</SwipeableView>
```

### Message Bubbles with Replies
```typescript
<MessageBubble>
  {replyTo && <ReplyPreview event={replyTo} />}
  <MessageContent markdown={content} />
  <MessageMeta>
    <Author>{author.name}</Author>
    <Time>{formatTime(created_at)}</Time>
    {isEdited && <EditedIndicator />}
  </MessageMeta>
</MessageBubble>
```

## Critical Implementation Notes

1. **NEVER create wrapper types around NDK** - Use NDK types directly
2. **ALWAYS use NDK's .reply() method** - Don't manually construct reply tags
3. **Project tags are immutable** - Once published, tags define project behavior
4. **Typing indicators auto-expire** - Send stop event or let 5s timeout handle it
5. **Voice messages use NIP-94** - Standard file event with audio metadata
6. **Cache only non-ephemeral events** - Don't cache typing indicators or status
7. **Mobile swipes are horizontal only** - Vertical is for scrolling
8. **Draft persistence is per-thread** - Each conversation has its own draft
9. **Agent instructions are project-specific** - Same agent behaves differently per project
10. **MCP tools require explicit selection** - Not auto-enabled for projects

## Testing Requirements

### Unit Test Coverage Required
- [ ] All NDK event creation/parsing
- [ ] Tagging system logic
- [ ] Reply threading logic
- [ ] Mention extraction
- [ ] Draft management
- [ ] Navigation functions

### E2E Test Scenarios Required
- [ ] Complete project creation flow
- [ ] Send message with @mentions
- [ ] Reply to message in thread
- [ ] Voice message record/play
- [ ] Task creation and updates
- [ ] Agent selection and configuration
- [ ] Mobile swipe navigation
- [ ] Theme switching
- [ ] Offline/online transitions

### Integration Tests Required
- [ ] NDK relay connections
- [ ] Event publishing
- [ ] Subscription management
- [ ] Cache persistence
- [ ] File uploads to Blossom
- [ ] LLM API calls
- [ ] Voice transcription

## File References from Original Codebase

Key files to study for implementation details:
- `/src/lib/ndk-events/` - Custom event classes
- `/src/components/ChatInterface.tsx` - Core chat logic
- `/src/components/dialogs/CreateProjectDialog.tsx` - Multi-step flow
- `/src/hooks/useMentionAutocomplete.ts` - @mention system
- `/src/components/MessageWithReplies.tsx` - Threading UI
- `/src/lib/utils/audioEvents.ts` - Voice message handling
- `/src/stores/project/index.ts` - Project state management
- `/src/contexts/NavigationContext.tsx` - Navigation patterns

This inventory represents 100% feature completeness requirement. Every feature listed here MUST be implemented in the TanStack version.