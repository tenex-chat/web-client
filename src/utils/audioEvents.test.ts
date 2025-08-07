import { describe, it, expect } from "vitest";
import { NDKEvent } from "@nostr-dev-kit/ndk";
import { 
    isAudioEvent, 
    getAudioURL, 
    getAudioDuration, 
    getAudioWaveform,
    MAX_WAVEFORM_SAMPLES 
} from "./audioEvents";

describe("audioEvents", () => {
    describe("isAudioEvent", () => {
        it("should identify NIP-94 audio events", () => {
            const event = {
                kind: 1063,
                tags: [["m", "audio/mp3"]],
            } as NDKEvent;
            
            expect(isAudioEvent(event)).toBe(true);
        });

        it("should reject NIP-94 non-audio events", () => {
            const event = {
                kind: 1063,
                tags: [["m", "image/png"]],
            } as NDKEvent;
            
            expect(isAudioEvent(event)).toBe(false);
        });

        it("should identify legacy NIP-A0 audio events (kind 1222)", () => {
            const event = {
                kind: 1222,
                tags: [],
            } as NDKEvent;
            
            expect(isAudioEvent(event)).toBe(true);
        });

        it("should identify legacy NIP-A0 audio events (kind 1223)", () => {
            const event = {
                kind: 1223,
                tags: [],
            } as NDKEvent;
            
            expect(isAudioEvent(event)).toBe(true);
        });

        it("should reject non-audio events", () => {
            const event = {
                kind: 1,
                tags: [],
            } as NDKEvent;
            
            expect(isAudioEvent(event)).toBe(false);
        });
    });

    describe("getAudioURL", () => {
        it("should extract URL from NIP-94 events", () => {
            const event = {
                kind: 1063,
                tags: [["url", "https://example.com/audio.mp3"]],
            } as NDKEvent;
            
            expect(getAudioURL(event)).toBe("https://example.com/audio.mp3");
        });

        it("should extract URL from legacy NIP-A0 events", () => {
            const event = {
                kind: 1222,
                content: "https://example.com/audio.mp3",
                tags: [],
            } as NDKEvent;
            
            expect(getAudioURL(event)).toBe("https://example.com/audio.mp3");
        });

        it("should return undefined for events without URL", () => {
            const event = {
                kind: 1063,
                tags: [],
            } as NDKEvent;
            
            expect(getAudioURL(event)).toBeUndefined();
        });

        it("should return undefined for non-audio events", () => {
            const event = {
                kind: 1,
                content: "https://example.com/audio.mp3",
                tags: [],
            } as NDKEvent;
            
            expect(getAudioURL(event)).toBeUndefined();
        });
    });

    describe("getAudioDuration", () => {
        it("should extract duration from NIP-94 events", () => {
            const event = {
                kind: 1063,
                tags: [["duration", "180"]],
            } as NDKEvent;
            
            expect(getAudioDuration(event)).toBe(180);
        });

        it("should extract duration from legacy NIP-A0 events with imeta", () => {
            const event = {
                kind: 1222,
                tags: [["imeta", "duration 240", "other data"]],
            } as NDKEvent;
            
            expect(getAudioDuration(event)).toBe(240);
        });

        it("should return 0 for events without duration", () => {
            const event = {
                kind: 1063,
                tags: [],
            } as NDKEvent;
            
            expect(getAudioDuration(event)).toBe(0);
        });

        it("should return 0 for invalid duration values", () => {
            const event = {
                kind: 1063,
                tags: [["duration", "invalid"]],
            } as NDKEvent;
            
            expect(getAudioDuration(event)).toBe(0);
        });
    });

    describe("getAudioWaveform", () => {
        it("should extract waveform from NIP-94 events", () => {
            const event = {
                kind: 1063,
                tags: [["waveform", "0.1 0.5 0.8 1.0 0.3"]],
            } as NDKEvent;
            
            expect(getAudioWaveform(event)).toEqual([0.1, 0.5, 0.8, 1.0, 0.3]);
        });

        it("should filter invalid waveform values", () => {
            const event = {
                kind: 1063,
                tags: [["waveform", "0.1 invalid -0.5 1.5 0.8"]],
            } as NDKEvent;
            
            expect(getAudioWaveform(event)).toEqual([0.1, 0.8]);
        });

        it("should extract waveform from legacy NIP-A0 events with imeta", () => {
            const event = {
                kind: 1222,
                tags: [["imeta", "waveform 0.2 0.4 0.6 0.8", "other data"]],
            } as NDKEvent;
            
            expect(getAudioWaveform(event)).toEqual([0.2, 0.4, 0.6, 0.8]);
        });

        it("should return empty array for events without waveform", () => {
            const event = {
                kind: 1063,
                tags: [],
            } as NDKEvent;
            
            expect(getAudioWaveform(event)).toEqual([]);
        });

        it("should handle empty waveform data", () => {
            const event = {
                kind: 1063,
                tags: [["waveform", ""]],
            } as NDKEvent;
            
            expect(getAudioWaveform(event)).toEqual([]);
        });
    });

    describe("constants", () => {
        it("should export MAX_WAVEFORM_SAMPLES", () => {
            expect(MAX_WAVEFORM_SAMPLES).toBe(100);
        });
    });
});