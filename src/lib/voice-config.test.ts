import { describe, expect, it, beforeEach, vi } from "vitest";
import {
    getAgentVoiceConfig,
    saveAgentVoiceConfig,
    removeAgentVoiceConfig,
    getAllAgentVoiceConfigs,
} from "./voice-config";

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    key: vi.fn(),
    length: 0,
};
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
});

// Mock logger
vi.mock('./logger', () => ({
    logger: {
        error: vi.fn(),
    },
}));

describe("voice-config utilities", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getAgentVoiceConfig", () => {
        it("should return voice config for existing agent", () => {
            const mockConfig = {
                voiceId: "voice-1",
                voiceName: "Test Voice",
                language: "en-US",
                gender: "female"
            };
            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

            const config = getAgentVoiceConfig("agent-123");
            
            expect(config).toEqual(mockConfig);
            expect(localStorageMock.getItem).toHaveBeenCalledWith("agent-voice-agent-123");
        });

        it("should return null for non-existent agent", () => {
            localStorageMock.getItem.mockReturnValue(null);

            const config = getAgentVoiceConfig("agent-999");
            
            expect(config).toBeNull();
            expect(localStorageMock.getItem).toHaveBeenCalledWith("agent-voice-agent-999");
        });

        it("should return null when agent slug is empty", () => {
            const config = getAgentVoiceConfig("");
            
            expect(config).toBeNull();
            expect(localStorageMock.getItem).not.toHaveBeenCalled();
        });

        it("should handle invalid JSON gracefully", () => {
            localStorageMock.getItem.mockReturnValue("invalid json");

            const config = getAgentVoiceConfig("agent-123");
            
            expect(config).toBeNull();
        });

        it("should work with specific agent slug", () => {
            const mockConfig = {
                voiceId: "voice-special",
                voiceName: "Special Voice",
                language: "fr-FR",
                gender: "male"
            };
            localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

            const config = getAgentVoiceConfig("project-manager");
            
            expect(config).toEqual(mockConfig);
            expect(localStorageMock.getItem).toHaveBeenCalledWith("agent-voice-project-manager");
        });
    });

    describe("saveAgentVoiceConfig", () => {
        it("should save new voice config", () => {
            const config = {
                voiceId: "voice-new",
                voiceName: "New Voice",
                language: "es-ES",
                gender: "female"
            };
            
            saveAgentVoiceConfig("agent-new", config);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                "agent-voice-agent-new",
                JSON.stringify(config)
            );
        });

        it("should update existing voice config", () => {
            const newConfig = {
                voiceId: "voice-updated",
                voiceName: "Updated Voice",
                language: "de-DE",
                gender: "male"
            };
            
            saveAgentVoiceConfig("agent-123", newConfig);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                "agent-voice-agent-123",
                JSON.stringify(newConfig)
            );
        });

        it("should throw error for empty agent slug", () => {
            const config = {
                voiceId: "voice-1",
                voiceName: "Voice",
                language: "en-US",
                gender: "female"
            };
            
            expect(() => saveAgentVoiceConfig("", config)).toThrow("Agent slug is required");
        });

        it("should save config with specific agent slug", () => {
            const config = {
                voiceId: "voice-pm",
                voiceName: "PM Voice",
                language: "en-GB",
                gender: "male"
            };
            
            saveAgentVoiceConfig("project-manager", config);

            expect(localStorageMock.setItem).toHaveBeenCalledWith(
                "agent-voice-project-manager",
                JSON.stringify(config)
            );
        });

        it("should handle localStorage errors", () => {
            const config = {
                voiceId: "voice-1",
                voiceName: "Voice",
                language: "en-US",
                gender: "female"
            };
            
            localStorageMock.setItem.mockImplementation(() => {
                throw new Error("Storage full");
            });

            expect(() => saveAgentVoiceConfig("agent-123", config)).toThrow("Storage full");
        });
    });

    describe("removeAgentVoiceConfig", () => {
        it("should remove existing voice config", () => {
            removeAgentVoiceConfig("agent-123");

            expect(localStorageMock.removeItem).toHaveBeenCalledWith("agent-voice-agent-123");
        });

        it("should handle removing non-existent config", () => {
            removeAgentVoiceConfig("agent-999");

            expect(localStorageMock.removeItem).toHaveBeenCalledWith("agent-voice-agent-999");
        });

        it("should handle empty agent slug", () => {
            removeAgentVoiceConfig("");

            expect(localStorageMock.removeItem).not.toHaveBeenCalled();
        });

        it("should remove config with specific agent slug", () => {
            removeAgentVoiceConfig("project-manager");

            expect(localStorageMock.removeItem).toHaveBeenCalledWith("agent-voice-project-manager");
        });

        it("should handle localStorage errors gracefully", () => {
            localStorageMock.removeItem.mockImplementation(() => {
                throw new Error("Remove failed");
            });

            // Should not throw
            expect(() => removeAgentVoiceConfig("agent-123")).not.toThrow();
        });
    });

    describe("getAllAgentVoiceConfigs", () => {
        it("should return all voice configs", () => {
            // Mock localStorage with multiple configs
            localStorageMock.length = 5;
            localStorageMock.key.mockImplementation((index) => {
                const keys = [
                    "agent-voice-agent-123",
                    "other-key",
                    "agent-voice-agent-456",
                    "agent-voice-project-manager",
                    "another-key"
                ];
                return keys[index] || null;
            });
            
            localStorageMock.getItem.mockImplementation((key) => {
                const configs = {
                    "agent-voice-agent-123": JSON.stringify({
                        voiceId: "voice-1",
                        voiceName: "Voice 1",
                        language: "en-US",
                        gender: "female"
                    }),
                    "agent-voice-agent-456": JSON.stringify({
                        voiceId: "voice-2",
                        voiceName: "Voice 2",
                        language: "fr-FR",
                        gender: "male"
                    }),
                    "agent-voice-project-manager": JSON.stringify({
                        voiceId: "voice-3",
                        voiceName: "Voice 3",
                        language: "es-ES",
                        gender: "female"
                    })
                };
                return configs[key] || null;
            });

            const configs = getAllAgentVoiceConfigs();
            
            expect(configs).toEqual({
                "agent-123": {
                    voiceId: "voice-1",
                    voiceName: "Voice 1",
                    language: "en-US",
                    gender: "female"
                },
                "agent-456": {
                    voiceId: "voice-2",
                    voiceName: "Voice 2",
                    language: "fr-FR",
                    gender: "male"
                },
                "project-manager": {
                    voiceId: "voice-3",
                    voiceName: "Voice 3",
                    language: "es-ES",
                    gender: "female"
                }
            });
        });

        it("should return empty object when no configs exist", () => {
            localStorageMock.length = 3;
            localStorageMock.key.mockImplementation((index) => {
                const keys = ["other-key", "another-key", "yet-another-key"];
                return keys[index] || null;
            });
            localStorageMock.getItem.mockReturnValue(null);

            const configs = getAllAgentVoiceConfigs();
            
            expect(configs).toEqual({});
        });

        it("should handle invalid JSON in configs and continue processing valid ones", () => {
            localStorageMock.length = 2;
            localStorageMock.key.mockImplementation((index) => {
                const keys = ["agent-voice-agent-123", "agent-voice-agent-456"];
                return keys[index] || null;
            });
            
            localStorageMock.getItem.mockImplementation((key) => {
                if (key === "agent-voice-agent-123") {
                    return "invalid json";
                }
                if (key === "agent-voice-agent-456") {
                    return JSON.stringify({
                        voiceId: "voice-2",
                        voiceName: "Voice 2",
                        language: "en-US",
                        gender: "female"
                    });
                }
                return null;
            });

            const configs = getAllAgentVoiceConfigs();
            
            // After the fix, invalid JSON is skipped and valid configs are returned
            expect(configs).toEqual({
                "agent-456": {
                    voiceId: "voice-2",
                    voiceName: "Voice 2",
                    language: "en-US",
                    gender: "female"
                }
            });
        });

        it("should handle empty localStorage", () => {
            localStorageMock.length = 0;

            const configs = getAllAgentVoiceConfigs();
            
            expect(configs).toEqual({});
        });
    });
});