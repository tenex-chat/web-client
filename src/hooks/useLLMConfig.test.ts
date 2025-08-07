import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLLMConfig } from "./useLLMConfig";

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value;
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
    };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("useLLMConfig", () => {
    beforeEach(() => {
        localStorageMock.clear();
        vi.clearAllMocks();
    });

    it("should initialize with default configuration", () => {
        const { result } = renderHook(() => useLLMConfig());

        expect(result.current.config).toEqual({
            configurations: {},
            defaults: {
                default: undefined,
                titleGeneration: undefined,
            },
            credentials: {},
            speech: undefined,
        });
    });

    it("should load saved configuration from localStorage", () => {
        const savedConfig = {
            configurations: {
                testConfig: {
                    provider: "openai" as const,
                    model: "gpt-4",
                    apiKey: "test-key",
                },
            },
            defaults: {
                default: "testConfig",
                titleGeneration: undefined,
            },
            credentials: {
                openai: "test-key",
            },
            speech: undefined,
        };

        localStorageMock.setItem("tenex_llm_config", JSON.stringify(savedConfig));

        const { result } = renderHook(() => useLLMConfig());

        expect(result.current.config).toEqual(savedConfig);
    });

    it("should add a new configuration", () => {
        const { result } = renderHook(() => useLLMConfig());

        act(() => {
            result.current.addConfiguration("myConfig", {
                provider: "openai",
                model: "gpt-4",
                apiKey: "test-api-key",
            });
        });

        expect(result.current.config.configurations.myConfig).toEqual({
            provider: "openai",
            model: "gpt-4",
            apiKey: "test-api-key",
        });
    });

    it("should remove a configuration", () => {
        const { result } = renderHook(() => useLLMConfig());

        // First add a configuration
        act(() => {
            result.current.addConfiguration("configToRemove", {
                provider: "anthropic",
                model: "claude-3",
                apiKey: "test-key",
            });
        });

        // Then remove it
        act(() => {
            result.current.removeConfiguration("configToRemove");
        });

        expect(result.current.config.configurations.configToRemove).toBeUndefined();
    });

    it("should set default configuration", () => {
        const { result } = renderHook(() => useLLMConfig());

        act(() => {
            result.current.setDefault("default", "myDefaultConfig");
        });

        expect(result.current.config.defaults.default).toBe("myDefaultConfig");
    });

    it("should save and retrieve credentials", () => {
        const { result } = renderHook(() => useLLMConfig());

        act(() => {
            result.current.setCredentials("openai", "test-openai-key");
            result.current.setCredentials("anthropic", "test-anthropic-key");
        });

        expect(result.current.getCredentials("openai")).toBe("test-openai-key");
        expect(result.current.getCredentials("anthropic")).toBe("test-anthropic-key");
    });

    it("should get configuration by use case", () => {
        const { result } = renderHook(() => useLLMConfig());

        const testConfig = {
            provider: "google" as const,
            model: "gemini-pro",
            apiKey: "google-key",
        };

        act(() => {
            result.current.addConfiguration("googleConfig", testConfig);
            result.current.setDefault("testing", "googleConfig");
        });

        expect(result.current.getConfigForUseCase("testing")).toEqual(testConfig);
    });

    it("should persist configuration to localStorage on changes", () => {
        const { result } = renderHook(() => useLLMConfig());

        act(() => {
            result.current.addConfiguration("persistTest", {
                provider: "groq",
                model: "mixtral-8x7b",
                apiKey: "groq-key",
            });
        });

        expect(localStorageMock.setItem).toHaveBeenCalledWith(
            "tenex_llm_config",
            expect.stringContaining("persistTest")
        );
    });
});