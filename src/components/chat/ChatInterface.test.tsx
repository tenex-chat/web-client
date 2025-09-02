import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";

// Mock all external dependencies before importing component
vi.mock("@nostr-dev-kit/ndk", () => ({
  NDKEvent: vi.fn().mockImplementation(() => ({
    content: "",
    tags: [],
    kind: 1,
    pubkey: "",
    created_at: Math.floor(Date.now() / 1000),
    publish: vi.fn().mockResolvedValue(undefined),
    sign: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockReturnValue({
      content: "",
      tags: [],
      publish: vi.fn().mockResolvedValue(undefined),
    }),
  })),
  NDKUser: vi.fn().mockImplementation(() => ({
    pubkey: "test-pubkey",
    profile: {
      name: "Test User",
      picture: "https://example.com/avatar.jpg",
    },
  })),
  NDKKind: {},
}));

vi.mock("@nostr-dev-kit/ndk-hooks", () => ({
  useNDK: vi.fn(),
  useNDKCurrentUser: vi.fn(),
  useSubscribe: vi.fn(),
}));

vi.mock("@nostr-dev-kit/ndk-blossom", () => ({
  default: vi.fn(),
}));

vi.mock("@/lib/ndk-events/NDKProject", () => ({
  NDKProject: vi.fn().mockImplementation(() => ({
    id: "test-project-id",
    title: "Test Project",
    content: "Test project description",
    tagId: vi.fn().mockReturnValue("test-project-reference"),
    tagReference: vi.fn().mockReturnValue("test-project-reference"),
    tags: [],
    pubkey: "test-pubkey",
    kind: 31933,
    created_at: Math.floor(Date.now() / 1000),
  })),
}));

vi.mock("jotai", () => ({
  useAtom: vi.fn().mockReturnValue([false, vi.fn()]),
  atom: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock("@/hooks/useKeyboardHeight", () => ({
  useKeyboardHeight: vi.fn().mockReturnValue(0),
}));

vi.mock("@/hooks/useMediaQuery", () => ({
  useIsMobile: vi.fn().mockReturnValue(false),
}));

vi.mock("@/hooks/useProjectOnlineAgents", () => ({
  useProjectOnlineAgents: vi.fn().mockReturnValue({
    agentList: [],
    isOnline: false,
    projectStatus: null,
  }),
}));

vi.mock("@/hooks/useAI", () => ({
  useAI: vi.fn().mockReturnValue({
    cleanupText: vi.fn(),
    transcribe: vi.fn(),
    speak: vi.fn(),
    hasProvider: false,
    hasTTS: false,
    hasSTT: false,
    voiceSettings: {
      enabled: false,
      provider: 'openai',
      voiceId: 'alloy',
      apiKey: '',
      speed: 1.0
    },
    activeProvider: null,
  }),
}));

vi.mock("@/hooks/useAgentVoiceConfig", () => ({
  useAgentVoiceConfig: vi.fn().mockReturnValue({
    config: {
      voiceId: 'alloy',
      provider: 'openai',
      speed: 1.0,
      pitch: 1.0,
      enabled: false,
      apiKey: ''
    },
    agentConfig: null,
    availableVoices: [],
    loadingVoices: false,
    saveConfig: vi.fn(),
    removeConfig: vi.fn(),
    testVoice: vi.fn(),
    hasCustomConfig: false,
  }),
}))

vi.mock("@/lib/utils/extractTTSContent", () => ({
  extractTTSContent: vi.fn().mockReturnValue(""),
}));

vi.mock("@/lib/utils/audioEvents", () => ({
  isAudioEvent: vi.fn().mockReturnValue(false),
}));

vi.mock("@/components/dialogs/VoiceDialog", () => ({
  VoiceDialog: () => null,
}));

vi.mock("@/components/upload/ImageUploadQueue", () => ({
  ImageUploadQueue: () => null,
}));

vi.mock("@/stores/ai-config-store", () => ({
  activeProviderAtom: vi.fn(),
  voiceSettingsAtom: vi.fn(),
  openAIApiKeyAtom: vi.fn(),
  autoTTSAtom: vi.fn(),
}));

// Import the component after all mocks are set up
import { ChatInterface } from "./ChatInterface";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { useNDK, useNDKCurrentUser, useSubscribe } from "@nostr-dev-kit/ndk-hooks";

describe("ChatInterface", () => {
  const mockNdk = {
    connect: vi.fn(),
    subscribe: vi.fn().mockReturnValue({
      on: vi.fn(),
      stop: vi.fn(),
    }),
    getUser: vi.fn().mockReturnValue({
      pubkey: "test-pubkey",
      profile: { name: "Test User" },
    }),
  };

  const mockUser = {
    pubkey: "test-pubkey",
    profile: { name: "Test User" },
  };

  const mockProject = new NDKProject();

  const defaultProps = {
    project: mockProject,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useNDK).mockReturnValue({ ndk: mockNdk as any });
    vi.mocked(useNDKCurrentUser).mockReturnValue(mockUser as any);
    vi.mocked(useSubscribe).mockReturnValue({ events: [], eose: false });
  });

  it("renders chat interface components", () => {
    render(<ChatInterface {...defaultProps} />);

    expect(
      screen.getByPlaceholderText("Type a message..."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send/i })).toBeInTheDocument();
  });

  it("displays project title in header", () => {
    render(<ChatInterface {...defaultProps} />);
    
    // Check that the project title is displayed
    expect(screen.getByText("Test Project")).toBeInTheDocument();
  });
});
