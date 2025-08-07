import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    fetchOpenRouterModels,
    fetchOllamaModels,
    getModelsForProvider,
    formatPrice,
    formatModelWithPricing,
    validateApiKeyFormat,
} from "./llmModels";
import type { LLMModelOption } from "../types/llm";

// Mock fetch globally
global.fetch = vi.fn();

describe("llmModels", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Mock window.location.origin
        Object.defineProperty(window, "location", {
            value: { origin: "http://localhost:3000" },
            writable: true,
        });
    });

    describe("fetchOpenRouterModels", () => {
        it("should fetch and transform OpenRouter models successfully", async () => {
            const mockResponse = {
                data: [
                    {
                        id: "anthropic/claude-3.5-sonnet",
                        name: "Claude 3.5 Sonnet",
                        input_modalities: ["text"],
                        output_modalities: ["text"],
                        pricing: {
                            prompt: "0.000003",
                            completion: "0.000015",
                            input_cache_read: "0.0000003",
                            input_cache_write: "0.00000375",
                        },
                        context_length: 200000,
                    },
                    {
                        id: "openai/gpt-4o",
                        name: "GPT-4o",
                        input_modalities: ["text"],
                        output_modalities: ["text"],
                        pricing: {
                            prompt: "0.000005",
                            completion: "0.000015",
                        },
                        context_length: 128000,
                    },
                ],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const models = await fetchOpenRouterModels();

            expect(models).toHaveLength(2);
            expect(models[0]).toEqual({
                id: "anthropic/claude-3.5-sonnet",
                name: "Claude 3.5 Sonnet",
                supportsCaching: true,
                promptPrice: 3,
                completionPrice: 15,
                cacheReadPrice: 0.3,
                cacheWritePrice: 3.75,
                contextLength: 200000,
            });
            expect(models[1].supportsCaching).toBe(false);
        });

        it("should return fallback models when API fails", async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

            const models = await fetchOpenRouterModels();

            expect(models).toHaveLength(4);
            expect(models[0].id).toBe("anthropic/claude-3.5-sonnet");
        });

        it("should filter out non-text models", async () => {
            const mockResponse = {
                data: [
                    {
                        id: "model-1",
                        name: "Text Model",
                        input_modalities: ["text"],
                        output_modalities: ["text"],
                        pricing: { prompt: "0.001", completion: "0.002" },
                        context_length: 10000,
                    },
                    {
                        id: "model-2",
                        name: "Image Model",
                        input_modalities: ["image"],
                        output_modalities: ["image"],
                        pricing: { prompt: "0.001", completion: "0.002" },
                        context_length: 10000,
                    },
                ],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const models = await fetchOpenRouterModels();

            expect(models).toHaveLength(1);
            expect(models[0].id).toBe("model-1");
        });
    });

    describe("fetchOllamaModels", () => {
        it("should fetch Ollama models successfully", async () => {
            const mockResponse = {
                models: [
                    { name: "llama3.2" },
                    { name: "codellama" },
                ],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const models = await fetchOllamaModels();

            expect(models).toHaveLength(2);
            expect(models[0]).toEqual({
                id: "llama3.2",
                name: "llama3.2",
                provider: "ollama",
            });
        });

        it("should return fallback models when Ollama is not running", async () => {
            (global.fetch as any).mockRejectedValueOnce(new Error("Connection refused"));

            const models = await fetchOllamaModels();

            expect(models).toHaveLength(6);
            expect(models[0].id).toBe("llama3.2");
            expect(models[0].provider).toBe("ollama");
        });
    });

    describe("getModelsForProvider", () => {
        it("should fetch OpenRouter models with pricing info", async () => {
            const mockResponse = {
                data: [
                    {
                        id: "test/model",
                        name: "Test Model",
                        input_modalities: ["text"],
                        output_modalities: ["text"],
                        pricing: {
                            prompt: "0.000001",
                            completion: "0.000002",
                            input_cache_read: "0.0000001",
                            input_cache_write: "0.0000015",
                        },
                        context_length: 50000,
                    },
                ],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const models = await getModelsForProvider("openrouter");

            expect(models).toHaveLength(1);
            expect(models[0].pricing?.prompt).toBe(1);
            expect(models[0].pricing?.completion).toBe(2);
            expect(models[0].pricing?.cacheRead).toBeCloseTo(0.1, 10);
            expect(models[0].pricing?.cacheWrite).toBe(1.5);
        });

        it("should fetch Ollama models", async () => {
            const mockResponse = {
                models: [{ name: "mistral" }],
            };

            (global.fetch as any).mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const models = await getModelsForProvider("ollama");

            expect(models).toHaveLength(1);
            expect(models[0].provider).toBe("ollama");
        });

        it("should return static models for other providers", async () => {
            const models = await getModelsForProvider("openai");
            expect(models.length).toBeGreaterThan(0);
            expect(models[0].provider).toBe("openai");
        });
    });

    describe("formatPrice", () => {
        it("should format price correctly", () => {
            expect(formatPrice(3.5)).toBe("$3.50/1M");
            expect(formatPrice(0.25)).toBe("$0.25/1M");
            expect(formatPrice(15)).toBe("$15.00/1M");
        });
    });

    describe("formatModelWithPricing", () => {
        it("should format model without pricing", () => {
            const model: LLMModelOption = {
                id: "test",
                name: "Test Model",
                provider: "openai",
            };
            expect(formatModelWithPricing(model)).toBe("Test Model");
        });

        it("should format model with pricing", () => {
            const model: LLMModelOption = {
                id: "test",
                name: "Test Model",
                provider: "openai",
                pricing: {
                    prompt: 3,
                    completion: 15,
                },
            };
            expect(formatModelWithPricing(model)).toBe("Test Model ($3.00/1M/$15.00/1M)");
        });

        it("should show caching indicator", () => {
            const model: LLMModelOption = {
                id: "test",
                name: "Test Model",
                provider: "openai",
                supportsCaching: true,
                pricing: {
                    prompt: 3,
                    completion: 15,
                },
            };
            expect(formatModelWithPricing(model)).toContain("🔄");
        });
    });

    describe("validateApiKeyFormat", () => {
        it("should validate OpenAI API keys", () => {
            expect(validateApiKeyFormat("openai", "sk-abc123")).toBe(true);
            expect(validateApiKeyFormat("openai", "invalid")).toBe(false);
        });

        it("should validate OpenRouter API keys", () => {
            expect(validateApiKeyFormat("openrouter", "sk-or-abc123")).toBe(true);
            expect(validateApiKeyFormat("openrouter", "sk-abc123")).toBe(false);
        });

        it("should validate Anthropic API keys", () => {
            expect(validateApiKeyFormat("anthropic", "sk-ant-abc123")).toBe(true);
            expect(validateApiKeyFormat("anthropic", "sk-abc123")).toBe(false);
        });

        it("should validate Groq API keys", () => {
            expect(validateApiKeyFormat("groq", "gsk_abc123")).toBe(true);
            expect(validateApiKeyFormat("groq", "sk-abc123")).toBe(false);
        });

        it("should validate DeepSeek API keys", () => {
            expect(validateApiKeyFormat("deepseek", "sk-abc123")).toBe(true);
            expect(validateApiKeyFormat("deepseek", "invalid")).toBe(false);
        });

        it("should accept any non-empty string for Google", () => {
            expect(validateApiKeyFormat("google", "any-api-key")).toBe(true);
            expect(validateApiKeyFormat("google", "")).toBe(false);
        });

        it("should always return true for Ollama", () => {
            expect(validateApiKeyFormat("ollama", "")).toBe(true);
            expect(validateApiKeyFormat("ollama", "anything")).toBe(true);
        });
    });
});