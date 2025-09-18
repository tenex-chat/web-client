/**
 * Example: Intelligent Voice Assignment for TENEX Agents
 * 
 * This example demonstrates how to use the new voice profile management
 * and intelligent assignment features with ElevenLabs API.
 */

import { useEffect, useState } from "react";
import { voiceProfileManager, type AgentCharacteristics } from "@/services/ai/voice-profile-manager";
import { elevenLabsVoiceAnalyzer } from "@/services/ai/elevenlabs-voice-analyzer";
import { useAgentVoiceConfig } from "@/hooks/useAgentVoiceConfig";

// Example 1: Batch Voice Assignment for Multiple Agents
export async function assignVoicesToProjectAgents(projectId: string) {
  // Define agent characteristics based on their roles
  const agents = [
    {
      id: "agent-001",
      name: "Technical Assistant",
      characteristics: {
        role: "developer",
        personality: "professional",
        expertise: ["coding", "debugging", "architecture"],
        communicationStyle: "technical",
        preferredGender: "neutral" as const,
      },
    },
    {
      id: "agent-002", 
      name: "Creative Designer",
      characteristics: {
        role: "designer",
        personality: "energetic",
        expertise: ["ui/ux", "branding", "visual-design"],
        communicationStyle: "expressive",
        preferredGender: "female" as const,
      },
    },
    {
      id: "agent-003",
      name: "Project Manager",
      characteristics: {
        role: "manager",
        personality: "authoritative",
        expertise: ["planning", "coordination", "leadership"],
        communicationStyle: "clear and directive",
        preferredGender: "any" as const,
      },
    },
    {
      id: "agent-004",
      name: "Customer Support",
      characteristics: {
        role: "support",
        personality: "friendly",
        expertise: ["customer-service", "problem-solving"],
        communicationStyle: "warm and helpful",
        preferredGender: "female" as const,
      },
    },
  ];

  // Strategy 1: Characteristic-based matching (most intelligent)
  console.log("Strategy 1: Characteristic Matching");
  const characteristicsMap = new Map<string, AgentCharacteristics>();
  agents.forEach(agent => {
    characteristicsMap.set(agent.id, agent.characteristics);
  });

  const characteristicAssignments = voiceProfileManager.assignVoicesToMultipleAgents(
    agents.map(a => a.id),
    { type: "characteristic-match" },
    characteristicsMap
  );

  // Log assignments
  for (const [agentId, profile] of characteristicAssignments) {
    const agent = agents.find(a => a.id === agentId);
    console.log(`${agent?.name}: ${profile.name} (${profile.characteristics.personality})`);
  }

  // Strategy 2: Round-robin assignment (for diversity)
  console.log("\nStrategy 2: Round Robin Assignment");
  const roundRobinAssignments = voiceProfileManager.assignVoicesToMultipleAgents(
    agents.map(a => a.id),
    { type: "round-robin" },
    characteristicsMap
  );

  // Strategy 3: Role-based assignment
  console.log("\nStrategy 3: Role-based Assignment");
  const roleBasedAssignments = voiceProfileManager.assignVoicesToMultipleAgents(
    agents.map(a => a.id),
    { type: "role-based" },
    characteristicsMap
  );

  return characteristicAssignments;
}

// Example 2: Dynamic Voice Import from ElevenLabs
export async function importAndCategorizeElevenLabsVoices(apiKey: string) {
  // Set the API key
  elevenLabsVoiceAnalyzer.setApiKey(apiKey);

  // Generate voice profiles with specific filters
  const profiles = await elevenLabsVoiceAnalyzer.generateVoiceProfiles(
    // Optional filter: only import featured or specific category voices
    (voice) => {
      return voice.labels?.featured === true || 
             voice.category === "professional";
    }
  );

  // Import profiles into the manager
  for (const profile of profiles) {
    voiceProfileManager.addProfile(profile);
  }

  // Get featured voices for premium agents
  const featuredVoices = await elevenLabsVoiceAnalyzer.getFeaturedVoices();
  console.log(`Imported ${featuredVoices.length} featured voices`);

  // Categorize by language for international projects
  const englishVoices = await elevenLabsVoiceAnalyzer.getVoicesByLanguage("english");
  const spanishVoices = await elevenLabsVoiceAnalyzer.getVoicesByLanguage("spanish");
  
  console.log(`Available voices: ${englishVoices.length} English, ${spanishVoices.length} Spanish`);

  return profiles;
}

// Example 3: Component for Agent Voice Configuration
export function AgentVoiceConfigurator({ agentId }: { agentId: string }) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  
  // Define agent characteristics based on metadata
  const agentCharacteristics: AgentCharacteristics = {
    role: "assistant",
    personality: "friendly",
    expertise: ["general", "support"],
    communicationStyle: "conversational",
    preferredGender: "neutral",
  };

  const {
    config,
    voiceProfile,
    availableProfiles,
    assignVoiceByStrategy,
    assignVoiceProfile,
    getRecommendedVoices,
    testVoice,
  } = useAgentVoiceConfig(agentId, agentCharacteristics);

  useEffect(() => {
    // Get initial recommendations
    const recs = getRecommendedVoices(5);
    setRecommendations(recs);
  }, [getRecommendedVoices]);

  const handleSmartAssignment = async () => {
    // Use AI to find the best match
    const targetCharacteristics = {
      gender: agentCharacteristics.preferredGender,
      personality: agentCharacteristics.personality,
      style: "conversational" as const,
    };

    const matches = await elevenLabsVoiceAnalyzer.findBestVoiceMatch(
      targetCharacteristics,
      3
    );

    if (matches.length > 0) {
      // Create a profile from the best match
      const bestMatch = matches[0].voice;
      const characteristics = await elevenLabsVoiceAnalyzer.analyzeVoiceCharacteristics(
        bestMatch.voice_id
      );

      const profile = {
        id: `elevenlabs-${bestMatch.voice_id}`,
        name: bestMatch.name,
        voiceId: bestMatch.voice_id,
        provider: "elevenlabs" as const,
        characteristics,
        tags: [],
      };

      voiceProfileManager.addProfile(profile);
      assignVoiceProfile(profile.id);
    }
  };

  return (
    <div className="space-y-4">
      <h3>Voice Configuration for Agent</h3>
      
      {voiceProfile && (
        <div className="p-4 bg-blue-50 rounded">
          <h4>Current Voice: {voiceProfile.name}</h4>
          <p>Provider: {voiceProfile.provider}</p>
          <p>Personality: {voiceProfile.characteristics.personality}</p>
          <button onClick={() => testVoice("Hello, I am your assistant.")}>
            Test Voice
          </button>
        </div>
      )}

      <div className="space-y-2">
        <h4>Assignment Strategies</h4>
        
        <button
          onClick={() => assignVoiceByStrategy("characteristic-match")}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Smart Match (Based on Agent Profile)
        </button>
        
        <button
          onClick={() => assignVoiceByStrategy("random")}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Random Assignment
        </button>
        
        <button
          onClick={handleSmartAssignment}
          className="px-4 py-2 bg-purple-500 text-white rounded"
        >
          AI-Powered Best Match
        </button>
      </div>

      <div className="space-y-2">
        <h4>Recommended Voices</h4>
        {recommendations.map((profile) => (
          <div
            key={profile.id}
            className="p-3 border rounded cursor-pointer hover:bg-gray-50"
            onClick={() => assignVoiceProfile(profile.id)}
          >
            <h5>{profile.name}</h5>
            <p className="text-sm text-gray-600">
              {profile.characteristics.personality} • {profile.characteristics.gender}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h4>All Available Profiles</h4>
        <select
          onChange={(e) => assignVoiceProfile(e.target.value)}
          value={voiceProfile?.id || ""}
          className="w-full p-2 border rounded"
        >
          <option value="">Select a voice profile...</option>
          {availableProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name} ({profile.provider})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Example 4: Voice Analytics Dashboard
export function VoiceUsageAnalytics() {
  const [stats, setStats] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const usage = voiceProfileManager.getVoiceUsageStatistics();
    setStats(usage);
  }, []);

  const totalAgents = Array.from(stats.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 bg-white rounded shadow">
      <h3 className="text-xl font-bold mb-4">Voice Usage Analytics</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-blue-50 rounded">
          <p className="text-sm text-gray-600">Total Agents with Voices</p>
          <p className="text-2xl font-bold">{totalAgents}</p>
        </div>
        <div className="p-4 bg-green-50 rounded">
          <p className="text-sm text-gray-600">Unique Voices Used</p>
          <p className="text-2xl font-bold">{stats.size}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="font-semibold">Voice Distribution</h4>
        {Array.from(stats.entries()).map(([profileId, count]) => {
          const profile = voiceProfileManager.getProfile(profileId);
          if (!profile) return null;
          
          const percentage = (count / totalAgents) * 100;
          
          return (
            <div key={profileId} className="flex items-center gap-2">
              <span className="w-32 text-sm">{profile.name}</span>
              <div className="flex-1 bg-gray-200 rounded h-6">
                <div
                  className="bg-blue-500 h-full rounded"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm">{count} agents</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Example 5: Bulk Voice Operations
export async function performBulkVoiceOperations() {
  // 1. Import all ElevenLabs voices
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  await importAndCategorizeElevenLabsVoices(apiKey);

  // 2. Get all agents in the system
  const allAgents = [
    /* ... fetch from your system ... */
  ];

  // 3. Assign voices based on project type
  const projectTypes = {
    technical: ["developer", "qa", "devops"],
    creative: ["designer", "writer", "artist"],
    business: ["manager", "analyst", "consultant"],
    support: ["customer-service", "help-desk", "moderator"],
  };

  for (const [projectType, agentRoles] of Object.entries(projectTypes)) {
    const agents = allAgents.filter(agent => 
      agentRoles.includes(agent.role)
    );

    // Use different strategies for different project types
    const strategy = projectType === "creative" 
      ? { type: "random" as const } // More variety for creative projects
      : { type: "characteristic-match" as const }; // Best fit for others

    const assignments = voiceProfileManager.assignVoicesToMultipleAgents(
      agents.map(a => a.id),
      strategy,
      new Map(agents.map(a => [a.id, a.characteristics]))
    );

    console.log(`Assigned voices to ${assignments.size} ${projectType} agents`);
  }

  // 4. Generate report
  const stats = voiceProfileManager.getVoiceUsageStatistics();
  const report = {
    totalAgents: allAgents.length,
    agentsWithVoices: Array.from(stats.values()).reduce((a, b) => a + b, 0),
    uniqueVoicesUsed: stats.size,
    topVoices: Array.from(stats.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([profileId, count]) => ({
        profile: voiceProfileManager.getProfile(profileId),
        count,
      })),
  };

  return report;
}