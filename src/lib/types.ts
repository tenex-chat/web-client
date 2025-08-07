import type { NDKKind } from "@nostr-dev-kit/ndk";

/**
 * Nostr event kinds used in TENEX
 */
export const EVENT_KINDS = {
    // Standard Nostr kinds
    METADATA: 0 as NDKKind,
    CONTACT_LIST: 3 as NDKKind,

    // Chat-related
    CHAT: 11 as NDKKind,
    THREAD_REPLY: 1111 as NDKKind,
    GENERIC_REPLY: 1111 as NDKKind,

    // TENEX-specific kinds
    TASK: 1934 as NDKKind,
    AGENT_REQUEST: 3199 as NDKKind,
    AGENT_REQUEST_LIST: 13199 as NDKKind, // List of agent requests (10000 + 3199)
    AGENT_LESSON: 4129 as NDKKind,
    AGENT_CONFIG: 4199 as NDKKind,

    // Status and typing
    PROJECT_STATUS: 24010 as NDKKind,
    LLM_CONFIG_CHANGE: 24101 as NDKKind,
    TYPING_INDICATOR: 24111 as NDKKind,
    TYPING_INDICATOR_STOP: 24112 as NDKKind,
    STREAMING_RESPONSE: 21111 as NDKKind,

    // Addressable events
    ARTICLE: 30023 as NDKKind,
    TEMPLATE: 30717 as NDKKind,
    PROJECT: 31933 as NDKKind,
} as const;

export type EventKind = (typeof EVENT_KINDS)[keyof typeof EVENT_KINDS];

/**
 * LLM Configuration types
 */
export interface LLMConfig {
    provider: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: string | number | boolean | undefined;
}

export interface LLMFileConfiguration {
    provider: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: string | number | boolean | undefined;
}

/**
 * Backend and Profile types
 */
export interface BackendInfo {
    pubkey: string;
    name?: string;
    description?: string;
    avatar?: string;
    hostname?: string;
    status: "online" | "offline" | "busy";
    lastSeen?: number;
    capabilities?: string[];
    projects: Array<{ name: string; [key: string]: string | number | boolean | undefined }>;
    metadata?: Record<string, string | number | boolean | undefined>;
}

export interface ProfileData {
    pubkey: string;
    name?: string;
    displayName?: string;
    about?: string;
    picture?: string;
    banner?: string;
    nip05?: string;
    lud16?: string;
    website?: string;
    [key: string]: string | undefined;
}

/**
 * Utility functions
 */
// StringUtils and TaskUtils moved to lib/utils/business.ts for consolidation
// Import from there instead

/**
 * Backend status parsing utilities
 */
export function parseBackendStatusEvent(event: unknown): BackendInfo | null {
    try {
        const eventObj = event as Record<string, unknown>;
        const content = JSON.parse(eventObj.content as string);
        return {
            pubkey: eventObj.pubkey as string,
            name: content.name,
            description: content.description,
            avatar: content.avatar,
            status: content.status || "online",
            lastSeen: (eventObj.created_at as number) * 1000,
            capabilities: content.capabilities || [],
            projects: content.projects || [],
            metadata: content.metadata || {},
        };
    } catch {
        return null;
    }
}

export function migrateBackendStatus(status: unknown): BackendInfo {
    const statusObj = status as Record<string, unknown>;
    return {
        pubkey: statusObj.pubkey as string,
        name: statusObj.name as string | undefined,
        description: statusObj.description as string | undefined,
        avatar: statusObj.avatar as string | undefined,
        status: (statusObj.status as "online" | "offline" | "busy") || "online",
        lastSeen: statusObj.lastSeen as number | undefined,
        capabilities: (statusObj.capabilities as string[]) || [],
        projects: (statusObj.projects as Array<{ name: string; [key: string]: string | number | boolean | undefined }>) || [],
        metadata: (statusObj.metadata as Record<string, string | number | boolean | undefined>) || {},
    };
}

export function createBackendInfo(pubkey: string, data: Partial<BackendInfo> = {}): BackendInfo {
    return {
        pubkey,
        status: "offline",
        projects: [],
        ...data,
    };
}

interface OllamaModel {
    name: string;
    [key: string]: unknown;
}

interface OllamaModelsResponse {
    models: OllamaModel[];
}

export function isOllamaModelsResponse(response: unknown): response is OllamaModelsResponse {
    return response !== null && typeof response === 'object' && 'models' in response && Array.isArray((response as Record<string, unknown>).models);
}

// Type guards for NDK events
export function isNDKTask(event: unknown): event is import("@nostr-dev-kit/ndk").NDKEvent {
    return event !== null && typeof event === 'object' && 'kind' in event && typeof (event as Record<string, unknown>).kind === "number" && (event as Record<string, unknown>).kind === EVENT_KINDS.TASK;
}

export function isNDKInstruction(event: unknown): event is import("@nostr-dev-kit/ndk").NDKEvent {
    return event !== null && typeof event === 'object' && 'kind' in event && typeof (event as Record<string, unknown>).kind === "number" && (event as Record<string, unknown>).kind === EVENT_KINDS.AGENT_CONFIG;
}

export function isNDKAgent(event: unknown): event is import("@nostr-dev-kit/ndk").NDKEvent {
    return event !== null && typeof event === 'object' && 'kind' in event && typeof (event as Record<string, unknown>).kind === "number" && (event as Record<string, unknown>).kind === EVENT_KINDS.AGENT_CONFIG;
}

export function isNDKProject(event: unknown): event is import("@nostr-dev-kit/ndk").NDKEvent {
    return event !== null && typeof event === 'object' && 'kind' in event && typeof (event as Record<string, unknown>).kind === "number" && (event as Record<string, unknown>).kind === EVENT_KINDS.PROJECT;
}
