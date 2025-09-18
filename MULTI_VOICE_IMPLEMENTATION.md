# Multi-Voice Implementation

## Overview
The multi-voice feature has been simplified to provide deterministic voice assignment for agents based on their public keys.

## Current Behavior

### Single Voice Mode
- When only one voice is selected (`voiceId` is set, `voiceIds` is empty)
- All agents use the same voice

### Multi-Voice Mode (Deterministic Assignment)
- When multiple voices are selected (`voiceIds` has 2+ voices)
- Each agent automatically gets a consistent voice based on their pubkey
- The assignment is deterministic - the same agent always gets the same voice
- No user configuration needed beyond selecting multiple voices

## Key Changes from Original Implementation

1. **Removed Multi-Voice Toggle**: The system automatically detects whether to use single or multi-voice mode based on the number of selected voices

2. **Removed Selection Strategies**: No more "sequential" or "random" options. Only deterministic assignment is supported

3. **Simplified UI**: 
   - Single voice selection shows a simple voice picker
   - Multi-voice selection shows selected voices with automatic note about deterministic assignment

## Implementation Details

### Voice Assignment Logic (useAgentVoiceConfig hook)
```typescript
// Simplified voice selection logic
const getEffectiveVoiceId = (): string => {
  // 1. Agent-specific config (if any)
  if (agentConfig?.voiceId) {
    return agentConfig.voiceId;
  }
  
  // 2. Multi-voice deterministic selection
  if (globalVoiceSettings.voiceIds && 
      globalVoiceSettings.voiceIds.length > 0 &&
      agentPubkey) {
    const index = getDeterministicVoiceIndex(agentPubkey, voiceIds.length);
    return voiceIds[index];
  }
  
  // 3. Single voice setting
  if (globalVoiceSettings.voiceId) {
    return globalVoiceSettings.voiceId;
  }
  
  // 4. Default fallback
  return "alloy";
};
```

### Configuration Storage
```typescript
interface VoiceSettings {
  enabled: boolean;
  provider: "openai" | "elevenlabs";
  voiceId?: string;        // Single voice selection
  voiceIds?: string[];      // Multi-voice selection (deterministic)
  apiKey?: string;
  speed: number;
  autoSpeak: boolean;
  // REMOVED: multiVoiceEnabled
  // REMOVED: voiceSelectionStrategy
}
```

## User Experience

1. **Selecting a Single Voice**: User picks one voice, all agents use it
2. **Selecting Multiple Voices**: User picks 2+ voices, each agent automatically gets assigned one
3. **Voice Consistency**: Each agent always speaks with the same voice across sessions
4. **No Manual Configuration**: No need to manually assign voices to agents

## Testing

To test the implementation:

1. Go to Settings → Voice Settings
2. Enable Text-to-Speech
3. Try single voice: Select one voice, verify all agents use it
4. Try multi-voice: Select 2+ voices, verify each agent gets a consistent voice
5. Restart the app and verify voice assignments remain consistent