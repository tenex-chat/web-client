/**
 * Centralized test IDs for E2E testing with Playwright
 * These provide stable identifiers for dynamic DOM elements
 */

export const TestIds = {
  // Authentication
  auth: {
    loginScreen: 'login-screen',
    nsecInput: 'nsec-input',
    submitLogin: 'submit-login',
    logoutButton: 'logout-button',
  },

  // Navigation
  nav: {
    sidebar: 'nav-sidebar',
    projectList: 'project-list',
    projectItem: (projectId: string) => `project-item-${projectId}`,
    tabButton: (tabName: string) => `tab-button-${tabName}`,
    backButton: 'back-button',
    settingsButton: 'settings-button',
  },

  // Chat Interface
  chat: {
    interface: 'chat-interface',
    header: 'chat-header',
    messageList: 'chat-message-list',
    message: (messageId: string) => `chat-message-${messageId}`,
    messageContent: (messageId: string) => `message-content-${messageId}`,
    inputArea: 'chat-input-area',
    inputTextarea: 'chat-input-textarea',
    sendButton: 'chat-send-button',
    voiceButton: 'chat-voice-button',
    phoneButton: 'chat-phone-button',
    attachButton: 'chat-attach-button',
    mentionMenu: 'chat-mention-menu',
    mentionItem: (userId: string) => `mention-item-${userId}`,
    replyPreview: 'reply-preview',
    cancelReplyButton: 'cancel-reply-button',
    typingIndicator: 'typing-indicator',
    threadList: 'thread-list',
    threadItem: (threadId: string) => `thread-item-${threadId}`,
    newThreadButton: 'new-thread-button',
  },

  // Agents
  agents: {
    list: 'agents-list',
    item: (agentId: string) => `agent-item-${agentId}`,
    selector: 'agent-selector',
    selectorButton: 'agent-selector-button',
    selectorDropdown: 'agent-selector-dropdown',
    selectorItem: (agentId: string) => `agent-selector-item-${agentId}`,
    statusIndicator: (agentId: string) => `agent-status-${agentId}`,
    addButton: 'add-agent-button',
  },

  // Projects
  projects: {
    list: 'projects-list',
    card: (projectId: string) => `project-card-${projectId}`,
    createButton: 'create-project-button',
    createDialog: 'create-project-dialog',
    nameInput: 'project-name-input',
    descriptionInput: 'project-description-input',
    submitButton: 'create-project-submit',
    column: (projectId: string) => `project-column-${projectId}`,
    avatar: (projectId: string) => `project-avatar-${projectId}`,
    statusIndicator: (projectId: string) => `project-status-${projectId}`,
  },

  // Documents
  docs: {
    list: 'docs-list',
    item: (docId: string) => `doc-item-${docId}`,
    viewer: 'doc-viewer',
    editor: 'doc-editor',
    titleInput: 'doc-title-input',
    contentEditor: 'doc-content-editor',
    saveButton: 'doc-save-button',
    createButton: 'create-doc-button',
  },

  // Call/Voice
  call: {
    view: 'call-view',
    endButton: 'call-end-button',
    muteButton: 'call-mute-button',
    sendButton: 'call-send-button',
    agentDisplay: (agentId: string) => `call-agent-${agentId}`,
    duration: 'call-duration',
  },

  // Settings
  settings: {
    panel: 'settings-panel',
    tab: (tabName: string) => `settings-tab-${tabName}`,
    aiSettings: 'ai-settings',
    relaySettings: 'relay-settings',
    voiceSettings: 'voice-settings',
    saveButton: 'settings-save-button',
  },

  // Dialogs & Modals
  dialogs: {
    overlay: 'dialog-overlay',
    content: 'dialog-content',
    closeButton: 'dialog-close-button',
    confirmButton: 'dialog-confirm-button',
    cancelButton: 'dialog-cancel-button',
  },

  // FAB (Floating Action Button)
  fab: {
    menu: 'fab-menu',
    textButton: 'fab-text-button',
    voiceButton: 'fab-voice-button',
  },

  // Windows
  windows: {
    floating: (windowId: string) => `floating-window-${windowId}`,
    header: (windowId: string) => `window-header-${windowId}`,
    closeButton: (windowId: string) => `window-close-${windowId}`,
  },

  // Loading & Error States
  states: {
    loading: 'loading-indicator',
    error: 'error-message',
    empty: 'empty-state',
    offline: 'offline-indicator',
  },
} as const;

/**
 * Helper function to generate test IDs for dynamic lists
 */
export function getListItemTestId(listType: string, index: number, id?: string): string {
  if (id) {
    return `${listType}-item-${id}`;
  }
  return `${listType}-item-${index}`;
}

/**
 * Helper function to wait for dynamic content in tests
 */
export function getTestSelector(testId: string): string {
  return `[data-testid="${testId}"]`;
}

/**
 * Helper to create test attributes object
 */
export function testAttr(testId: string): { 'data-testid': string } {
  return { 'data-testid': testId };
}

/**
 * Conditional test attribute (only add in development/test environments)
 */
export function conditionalTestAttr(testId: string): { 'data-testid'?: string } {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return { 'data-testid': testId };
  }
  return {};
}