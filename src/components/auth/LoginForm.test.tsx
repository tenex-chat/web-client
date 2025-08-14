import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./LoginForm";
import { useNDKSessionLogin } from "@nostr-dev-kit/ndk-hooks";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { NDKPrivateKeySigner, NDKNip07Signer } from "@nostr-dev-kit/ndk-hooks";

// Mock the dependencies
vi.mock("@nostr-dev-kit/ndk-hooks");
vi.mock("@tanstack/react-router");
vi.mock("sonner");

describe("LoginForm Component", () => {
  const mockNdkLogin = vi.fn();
  const mockNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useNDKSessionLogin).mockReturnValue(mockNdkLogin);
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);
  });

  it("renders login form elements", () => {
    render(<LoginForm />);

    expect(screen.getByText(/welcome to tenex/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/nsec1\.\.\./i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /login with private key/i }),
    ).toBeInTheDocument();
  });

  it("shows error for invalid nsec format", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    // Click on the nsec tab first
    const nsecTab = screen.getByRole("tab", { name: /private key/i });
    await user.click(nsecTab);

    const input = screen.getByPlaceholderText(/nsec1\.\.\./i);
    const button = screen.getByRole("button", {
      name: /login with private key/i,
    });

    await user.type(input, "invalid-nsec");
    await user.click(button);

    expect(toast.error).toHaveBeenCalledWith("Invalid nsec format");
    expect(mockNdkLogin).not.toHaveBeenCalled();
  });

  it("handles successful login with valid nsec", async () => {
    mockNdkLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    // Click on the nsec tab first
    const nsecTab = screen.getByRole("tab", { name: /private key/i });
    await user.click(nsecTab);

    const input = screen.getByPlaceholderText(/nsec1\.\.\./i);
    const button = screen.getByRole("button", {
      name: /login with private key/i,
    });

    // Valid nsec format (starts with nsec1 and has correct length)
    const validNsec = "nsec1qyq8wumn8ghj7un9d3shxtnwv9hxwqargfrqmcvttqdfgvla";
    await user.type(input, validNsec);
    await user.click(button);

    await waitFor(() => {
      expect(mockNdkLogin).toHaveBeenCalled();
      const callArg = mockNdkLogin.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(NDKPrivateKeySigner);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/projects" });
      expect(toast.success).toHaveBeenCalledWith("Successfully logged in!");
    });
  });

  it("handles login failure", async () => {
    mockNdkLogin.mockRejectedValue(new Error("Connection failed"));
    const user = userEvent.setup();
    render(<LoginForm />);

    // Click on the nsec tab first
    const nsecTab = screen.getByRole("tab", { name: /private key/i });
    await user.click(nsecTab);

    const input = screen.getByPlaceholderText(/nsec1\.\.\./i);
    const button = screen.getByRole("button", {
      name: /login with private key/i,
    });

    const validNsec = "nsec1qyq8wumn8ghj7un9d3shxtnwv9hxwqargfrqmcvttqdfgvla";
    await user.type(input, validNsec);
    await user.click(button);

    await waitFor(() => {
      expect(mockNdkLogin).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to login: Connection failed",
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it("disables button while loading", async () => {
    mockNdkLogin.mockImplementation(() => new Promise(() => {})); // Never resolves
    const user = userEvent.setup();
    render(<LoginForm />);

    // Click on the nsec tab first
    const nsecTab = screen.getByRole("tab", { name: /private key/i });
    await user.click(nsecTab);

    const input = screen.getByPlaceholderText(/nsec1\.\.\./i);
    const button = screen.getByRole("button", {
      name: /login with private key/i,
    });

    const validNsec = "nsec1qyq8wumn8ghj7un9d3shxtnwv9hxwqargfrqmcvttqdfgvla";
    await user.type(input, validNsec);
    await user.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
      expect(screen.getByText(/logging in\.\.\./i)).toBeInTheDocument();
    });
  });

  it("clears password field after failed login", async () => {
    mockNdkLogin.mockRejectedValue(new Error("Invalid key"));
    const user = userEvent.setup();
    render(<LoginForm />);

    // Click on the nsec tab first
    const nsecTab = screen.getByRole("tab", { name: /private key/i });
    await user.click(nsecTab);

    const input = screen.getByPlaceholderText(
      /nsec1\.\.\./i,
    ) as HTMLInputElement;
    const button = screen.getByRole("button", {
      name: /login with private key/i,
    });

    const validNsec = "nsec1qyq8wumn8ghj7un9d3shxtnwv9hxwqargfrqmcvttqdfgvla";
    await user.type(input, validNsec);
    expect(input.value).toBe(validNsec);

    await user.click(button);

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });

  it("handles extension login when available", async () => {
    // Mock window.nostr
    Object.defineProperty(window, "nostr", {
      value: {},
      writable: true,
    });

    mockNdkLogin.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginForm />);

    // Wait for the component to detect the extension
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /login with extension/i }),
      ).toBeInTheDocument();
    });

    const extensionButton = screen.getByRole("button", {
      name: /login with extension/i,
    });
    await user.click(extensionButton);

    await waitFor(() => {
      expect(mockNdkLogin).toHaveBeenCalled();
      const callArg = mockNdkLogin.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(NDKNip07Signer);
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/projects" });
      expect(toast.success).toHaveBeenCalledWith(
        "Successfully logged in with extension!",
      );
    });

    // Clean up
    delete (window as Window & { nostr?: unknown }).nostr;
  });
});
