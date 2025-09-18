/**
 * Multi-Voice Selection Demo
 * 
 * This example demonstrates how the multi-voice selection feature works:
 * 
 * 1. Configure multiple voices in AI Settings
 * 2. Enable multi-voice mode and select "Deterministic" strategy
 * 3. Each agent gets a consistent voice based on their ID
 * 4. The voice assignment persists across sessions
 */

import { useAgentVoiceConfig } from "@/hooks/useAgentVoiceConfig";
import { Button } from "@/components/ui/button";

interface DemoAgentProps {
  agentId: string;
  agentName: string;
}

function DemoAgent({ agentId, agentName }: DemoAgentProps) {
  const { config, testVoice } = useAgentVoiceConfig(agentId);

  return (
    <div className="p-4 border rounded-lg space-y-2">
      <h3 className="font-semibold">{agentName}</h3>
      <div className="text-sm space-y-1">
        <p>Agent ID: {agentId}</p>
        <p>Assigned Voice: <span className="font-medium">{config.voiceId}</span></p>
        <p>Provider: {config.provider}</p>
      </div>
      <Button 
        size="sm"
        onClick={() => testVoice(`Hello, I am ${agentName}`)}
      >
        Test Voice
      </Button>
    </div>
  );
}

export function MultiVoiceDemo() {
  // Example agents with different IDs
  const agents = [
    { id: "agent-001", name: "Technical Support Agent" },
    { id: "agent-002", name: "Sales Assistant" },
    { id: "agent-003", name: "Customer Service Rep" },
    { id: "agent-004", name: "Documentation Helper" },
    { id: "agent-005", name: "Code Review Assistant" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Multi-Voice Selection Demo</h2>
        <p className="text-muted-foreground">
          Each agent below gets a deterministic voice assignment based on their ID.
          The same agent will always get the same voice, ensuring consistency.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <DemoAgent
            key={agent.id}
            agentId={agent.id}
            agentName={agent.name}
          />
        ))}
      </div>

      <div className="bg-muted p-4 rounded-lg">
        <h3 className="font-semibold mb-2">How it works:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Go to AI Settings and enable Text-to-Speech</li>
          <li>Enable "Multi-Voice Mode"</li>
          <li>Select multiple voices (e.g., alloy, nova, echo, shimmer)</li>
          <li>Set Voice Selection Strategy to "Deterministic"</li>
          <li>Each agent will automatically get a consistent voice based on their ID</li>
          <li>The voice assignment persists across page refreshes</li>
        </ol>
      </div>

      <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">Key Features:</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Deterministic Assignment:</strong> Same agent ID always gets the same voice</li>
          <li><strong>Even Distribution:</strong> Voices are distributed evenly across agents</li>
          <li><strong>Fallback Chain:</strong> Gracefully handles missing configurations</li>
          <li><strong>Persistence:</strong> Voice assignments are saved and restored</li>
          <li><strong>Flexibility:</strong> Can override with agent-specific configurations</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * Usage in your application:
 * 
 * 1. In chat components, pass the agent's public key to useAgentVoiceConfig:
 *    const { config } = useAgentVoiceConfig(agentPubkey);
 * 
 * 2. The hook automatically determines the correct voice based on:
 *    - Agent-specific configuration (if exists)
 *    - Multi-voice deterministic selection (if enabled)
 *    - Global single voice setting
 *    - Default fallback ("alloy")
 * 
 * 3. When speaking, use the config.voiceId:
 *    await textToSpeech(text, config.voiceId, config.provider);
 */