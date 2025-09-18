import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { InboxFABMenu } from "./InboxFABMenu";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useNDKCurrentPubkey } from "@nostr-dev-kit/ndk-hooks";
import { useInboxEvents } from "@/hooks/useInboxEvents";

// Mock the dependencies
vi.mock("@tanstack/react-router", () => ({
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));

vi.mock("@nostr-dev-kit/ndk-hooks", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    useNDKCurrentPubkey: vi.fn(),
    useProfileValue: vi.fn(() => ({ name: "Test User" })),
    NDKEvent: vi.fn(),
  };
});

vi.mock("@/hooks/useInboxEvents", () => ({
  useInboxEvents: vi.fn(),
}));

vi.mock("@/hooks/useKeyboardShortcuts", () => ({
  useInboxShortcut: vi.fn(),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe("InboxFABMenu", () => {
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useNavigate as any).mockReturnValue(mockNavigate);
    (useLocation as any).mockReturnValue({ pathname: "/projects" });
    (useNDKCurrentPubkey as any).mockReturnValue("test-pubkey");
  });

  it("should not render when user is not logged in", () => {
    (useNDKCurrentPubkey as any).mockReturnValue(null);
    (useInboxEvents as any).mockReturnValue({
      events: [],
      unreadCount: 0,
      loading: false,
    });

    const { container } = render(<InboxFABMenu />);
    expect(container.firstChild).toBeNull();
  });

  it("should not render on inbox page", () => {
    (useLocation as any).mockReturnValue({ pathname: "/inbox" });
    (useInboxEvents as any).mockReturnValue({
      events: [],
      unreadCount: 0,
      loading: false,
    });

    const { container } = render(<InboxFABMenu />);
    expect(container.firstChild).toBeNull();
  });

  it("should show unread count badge when there are unread events", () => {
    (useInboxEvents as any).mockReturnValue({
      events: [
        { id: "1", created_at: Date.now() / 1000, content: "Test event 1" },
        { id: "2", created_at: Date.now() / 1000, content: "Test event 2" },
      ],
      unreadCount: 2,
      loading: false,
    });

    render(<InboxFABMenu />);
    
    const badge = screen.getByText("2");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("animate-pulse");
  });

  it("should show 99+ when unread count exceeds 99", () => {
    (useInboxEvents as any).mockReturnValue({
      events: Array(150).fill(null).map((_, i) => ({
        id: `${i}`,
        created_at: Date.now() / 1000,
        content: `Test event ${i}`,
      })),
      unreadCount: 150,
      loading: false,
    });

    render(<InboxFABMenu />);
    
    const badge = screen.getByText("99+");
    expect(badge).toBeInTheDocument();
  });

  it("should toggle menu when FAB is clicked", async () => {
    (useInboxEvents as any).mockReturnValue({
      events: [
        { id: "1", created_at: Date.now() / 1000, content: "Test event", pubkey: "test-pubkey" },
      ],
      unreadCount: 1,
      loading: false,
    });

    render(<InboxFABMenu />);
    
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Inbox")).toBeInTheDocument();
      expect(screen.getByText("(1 events)")).toBeInTheDocument();
    });
  });

  it("should navigate to inbox page when View All is clicked", async () => {
    (useInboxEvents as any).mockReturnValue({
      events: [
        { id: "1", created_at: Date.now() / 1000, content: "Test event", pubkey: "test-pubkey" },
      ],
      unreadCount: 0,
      loading: false,
    });

    render(<InboxFABMenu />);
    
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      const viewAllButton = screen.getByText("View All");
      fireEvent.click(viewAllButton);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/inbox" });
    });
  });

  it("should show empty state when inbox has no events", async () => {
    (useInboxEvents as any).mockReturnValue({
      events: [],
      unreadCount: 0,
      loading: false,
    });

    render(<InboxFABMenu />);
    
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Your inbox is empty")).toBeInTheDocument();
    });
  });

  it("should use destructive variant when there are unread events", () => {
    (useInboxEvents as any).mockReturnValue({
      events: [
        { id: "1", created_at: Date.now() / 1000, content: "Test event" },
      ],
      unreadCount: 1,
      loading: false,
    });

    render(<InboxFABMenu />);
    
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-destructive");
  });

  it("should use secondary variant when there are no unread events", () => {
    (useInboxEvents as any).mockReturnValue({
      events: [],
      unreadCount: 0,
      loading: false,
    });

    render(<InboxFABMenu />);
    
    const button = screen.getByRole("button");
    expect(button).toHaveClass("bg-secondary");
  });
});