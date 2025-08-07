import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { generateThreadTitle } from "./openai";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock window.location.origin
Object.defineProperty(window, 'location', {
    value: { origin: 'http://localhost:3000' },
    writable: true,
});

describe("generateThreadTitle", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should throw error when no API key is configured", async () => {
        localStorageMock.getItem.mockReturnValue(null);
        
        await expect(generateThreadTitle("Test input")).rejects.toThrow(
            "LLM API key not found. Please configure it in settings."
        );
    });

    it("should return 'New Thread' for empty input", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                },
            },
            credentials: {
                openai: { apiKey: "test-api-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        const result = await generateThreadTitle("   ");
        expect(result).toBe("New Thread");
    });

    it("should successfully generate title with OpenAI", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                },
            },
            credentials: {
                openai: { apiKey: "test-api-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: "Test Generated Title",
                        },
                    },
                ],
            }),
        });

        const result = await generateThreadTitle("Create a React component for user authentication");
        
        expect(result).toBe("Test Generated Title");
        expect(mockFetch).toHaveBeenCalledWith(
            "https://api.openai.com/v1/chat/completions",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    Authorization: "Bearer test-api-key",
                    "Content-Type": "application/json",
                }),
            })
        );
    });

    it("should successfully generate title with OpenRouter", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openrouter",
                    model: "meta-llama/llama-3.2-11b-vision-instruct:free",
                },
            },
            credentials: {
                openrouter: { apiKey: "test-openrouter-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [
                    {
                        message: {
                            content: '"OpenRouter Title"',
                        },
                    },
                ],
            }),
        });

        const result = await generateThreadTitle("Implement dark mode toggle");
        
        // Title should have quotes removed
        expect(result).toBe("OpenRouter Title");
        expect(mockFetch).toHaveBeenCalledWith(
            "https://openrouter.ai/api/v1/chat/completions",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    Authorization: "Bearer test-openrouter-key",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "TENEX Web Client",
                }),
            })
        );
    });

    it("should use custom base URL when provided", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                },
            },
            credentials: {
                openai: { 
                    apiKey: "test-api-key",
                    baseUrl: "https://custom-api.example.com/v1"
                },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: "Custom API Title" } }],
            }),
        });

        await generateThreadTitle("Test input");
        
        expect(mockFetch).toHaveBeenCalledWith(
            "https://custom-api.example.com/v1/chat/completions",
            expect.any(Object)
        );
    });

    it("should truncate long titles to 50 characters", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                },
            },
            credentials: {
                openai: { apiKey: "test-api-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        const longTitle = "This is a very long title that definitely exceeds the maximum character limit of fifty";
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: longTitle } }],
            }),
        });

        const result = await generateThreadTitle("Test input");
        
        expect(result.length).toBeLessThanOrEqual(50);
        expect(result).toBe(longTitle.slice(0, 50));
    });

    it("should handle API errors gracefully", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                },
            },
            credentials: {
                openai: { apiKey: "test-api-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({
                error: { message: "Invalid API key" },
            }),
        });

        await expect(generateThreadTitle("Test input")).rejects.toThrow(
            "OpenAI API error: 401 - Invalid API key"
        );
    });

    it("should handle network errors", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                },
            },
            credentials: {
                openai: { apiKey: "test-api-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        mockFetch.mockRejectedValue(new Error("Network error"));

        await expect(generateThreadTitle("Test input")).rejects.toThrow(
            "Failed to generate title: Network error"
        );
    });

    it("should handle invalid API response", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                },
            },
            credentials: {
                openai: { apiKey: "test-api-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                // Missing choices array
                data: "invalid",
            }),
        });

        await expect(generateThreadTitle("Test input")).rejects.toThrow(
            "Invalid response from OpenAI API"
        );
    });

    it("should truncate input to 500 characters", async () => {
        const mockConfig = {
            defaults: { titleGeneration: "default" },
            configurations: {
                default: {
                    provider: "openai",
                    model: "gpt-3.5-turbo",
                },
            },
            credentials: {
                openai: { apiKey: "test-api-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        const longInput = "a".repeat(1000);
        
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: "Title" } }],
            }),
        });

        await generateThreadTitle(longInput);
        
        const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(callBody.messages[1].content.length).toBe(500);
    });

    it("should use default config when titleGeneration is not specified", async () => {
        const mockConfig = {
            defaults: { default: "fallback" },
            configurations: {
                fallback: {
                    provider: "openai",
                    model: "gpt-4",
                },
            },
            credentials: {
                openai: { apiKey: "test-api-key" },
            },
        };
        localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => ({
                choices: [{ message: { content: "Fallback Title" } }],
            }),
        });

        const result = await generateThreadTitle("Test");
        expect(result).toBe("Fallback Title");
    });
});