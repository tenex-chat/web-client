import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import {
  MessageCircle,
  Target,
  Play,
  CheckCircle,
  Settings,
  LucideIcon,
} from "lucide-react";

/**
 * Extracts LLM-related metadata from an event
 */
export function extractLLMMetadata(event: NDKEvent): Record<string, string> {
  const metadata: Record<string, string> = {};

  const llmTags = [
    "llm-model",
    "llm-provider",
    "llm-prompt-tokens",
    "llm-context-window",
    "llm-completion-tokens",
    "llm-total-tokens",
    "llm-reasoning-tokens",
    "llm-cached-input-tokens",
    "llm-cache-creation-tokens",
    "llm-cache-read-tokens",
    "llm-confidence",
    "llm-cost",
    "llm-cost-usd",
    "llm-system-prompt",
    "llm-user-prompt",
    "llm-raw-response",
  ];

  for (const tag of llmTags) {
    const value = event.tagValue(tag);
    if (value) {
      metadata[tag] = value;
    }
  }

  return metadata;
}

/**
 * Gets the current phase from an event
 * Checks new-phase first for transitions, then falls back to phase
 */
export function getEventPhase(event: NDKEvent): string | null {
  return event.tagValue("new-phase") || event.tagValue("phase") || null;
}

/**
 * Gets the phase transition source
 */
export function getEventPhaseFrom(event: NDKEvent): string | null {
  return event.tagValue("phase-from") || null;
}

/**
 * Gets the LLM model from an event
 */
export function getEventLLMModel(event: NDKEvent): string | null {
  return event.tagValue("llm-model") || null;
}

/**
 * Gets the LLM provider from an event
 */
export function getEventLLMProvider(event: NDKEvent): string | null {
  return event.tagValue("llm-provider") || null;
}

/**
 * Phase icon mapping
 */
const PHASE_ICONS: Record<string, LucideIcon> = {
  chat: MessageCircle,
  plan: Target,
  execute: Play,
  review: CheckCircle,
  chores: Settings,
};

/**
 * Gets the icon component for a phase
 */
export function getPhaseIcon(phase: string | null): LucideIcon | null {
  if (!phase) return null;
  return PHASE_ICONS[phase] || null;
}
