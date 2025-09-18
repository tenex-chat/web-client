import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import {
  Volume2,
  Plus,
  Settings,
  Shuffle,
  RefreshCw,
  Target,
  User,
  Wand2,
  Upload,
  Trash2,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import {
  voiceProfileManager,
  type VoiceProfile,
  type VoiceAssignmentStrategy,
  type AgentCharacteristics,
  type VoiceCharacteristics,
} from "@/services/ai/voice-profile-manager";
import { voiceDiscovery } from "@/services/ai/voice-discovery";
import { useAtomValue } from "jotai";
import { voiceSettingsAtom } from "@/stores/ai-config-store";

interface VoiceProfileManagerProps {
  agents?: Array<{
    id: string;
    name: string;
    role?: string;
    personality?: string;
  }>;
}

export function VoiceProfileManager({ agents = [] }: VoiceProfileManagerProps) {
  const [profiles, setProfiles] = useState<VoiceProfile[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<VoiceAssignmentStrategy>({
    type: "characteristic-match",
  });
  const [editingProfile, setEditingProfile] = useState<VoiceProfile | null>(null);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const voiceSettings = useAtomValue(voiceSettingsAtom);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    const allProfiles = voiceProfileManager.getAllProfiles();
    setProfiles(allProfiles);
  };

  const handleCreateProfile = async () => {
    // This would open a form to create a new profile
    setIsCreatingProfile(true);
  };

  const handleImportElevenLabsVoices = async () => {
    if (!voiceSettings.apiKey || voiceSettings.provider !== "elevenlabs") {
      toast.error("Please configure ElevenLabs API key in settings");
      return;
    }

    try {
      const voices = await voiceDiscovery.fetchVoices("elevenlabs", voiceSettings.apiKey);
      await voiceProfileManager.importElevenLabsVoices(voices);
      loadProfiles();
      toast.success(`Imported ${voices.length} ElevenLabs voices`);
    } catch (error) {
      toast.error("Failed to import ElevenLabs voices");
      console.error(error);
    }
  };

  const handleAssignVoices = () => {
    if (agents.length === 0) {
      toast.error("No agents available");
      return;
    }

    const characteristicsMap = new Map<string, AgentCharacteristics>();
    
    agents.forEach((agent) => {
      characteristicsMap.set(agent.id, {
        role: agent.role,
        personality: agent.personality,
      });
    });

    const assignments = voiceProfileManager.assignVoicesToMultipleAgents(
      agents.map((a) => a.id),
      selectedStrategy,
      characteristicsMap
    );

    const assignedCount = assignments.size;
    toast.success(`Assigned voices to ${assignedCount} agents`);
  };

  const handleTestVoice = async (profile: VoiceProfile) => {
    if (!voiceSettings.apiKey) {
      toast.error("API key not configured");
      return;
    }

    try {
      const text = `Hello, I am ${profile.name}. This is a test of my voice.`;
      const audioBlob = await voiceDiscovery.previewVoice(
        profile.provider,
        profile.voiceId,
        text,
        voiceSettings.apiKey
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = profile.settings?.speed || 1.0;
      await audio.play();

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      toast.error("Failed to test voice");
      console.error(error);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    voiceProfileManager.deleteProfile(profileId);
    loadProfiles();
    toast.success("Profile deleted");
  };

  const getStrategyIcon = (type: VoiceAssignmentStrategy["type"]) => {
    switch (type) {
      case "random":
        return <Shuffle className="h-4 w-4" />;
      case "round-robin":
        return <RefreshCw className="h-4 w-4" />;
      case "characteristic-match":
        return <Target className="h-4 w-4" />;
      case "role-based":
        return <User className="h-4 w-4" />;
      case "manual":
        return <Settings className="h-4 w-4" />;
    }
  };

  const renderCharacteristics = (characteristics: VoiceCharacteristics) => {
    const items = [];
    
    if (characteristics.gender) {
      items.push(
        <Badge key="gender" variant="secondary">
          {characteristics.gender}
        </Badge>
      );
    }
    
    if (characteristics.ageGroup) {
      items.push(
        <Badge key="age" variant="secondary">
          {characteristics.ageGroup}
        </Badge>
      );
    }
    
    if (characteristics.accent) {
      items.push(
        <Badge key="accent" variant="secondary">
          {characteristics.accent}
        </Badge>
      );
    }
    
    if (characteristics.personality) {
      items.push(
        <Badge key="personality" variant="outline">
          {characteristics.personality}
        </Badge>
      );
    }
    
    if (characteristics.tone) {
      items.push(
        <Badge key="tone" variant="outline">
          {characteristics.tone}
        </Badge>
      );
    }

    return <div className="flex gap-1 flex-wrap">{items}</div>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Voice Profile Management</CardTitle>
          <CardDescription>
            Manage voice profiles and assign them to agents intelligently
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profiles">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profiles">Voice Profiles</TabsTrigger>
              <TabsTrigger value="assignment">Agent Assignment</TabsTrigger>
              <TabsTrigger value="analytics">Usage Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="space-y-4">
              <div className="flex gap-2">
                <Dialog open={isCreatingProfile} onOpenChange={setIsCreatingProfile}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create Voice Profile</DialogTitle>
                      <DialogDescription>
                        Create a custom voice profile with specific characteristics
                      </DialogDescription>
                    </DialogHeader>
                    {/* Profile creation form would go here */}
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={handleImportElevenLabsVoices}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import ElevenLabs
                </Button>
              </div>

              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {profiles.map((profile) => (
                    <Card key={profile.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{profile.name}</h4>
                              <Badge variant={profile.provider === "openai" ? "default" : "secondary"}>
                                {profile.provider}
                              </Badge>
                            </div>
                            
                            {renderCharacteristics(profile.characteristics)}
                            
                            {profile.preferredForAgentTypes && (
                              <div className="flex gap-1 flex-wrap">
                                {profile.preferredForAgentTypes.map((type) => (
                                  <Badge key={type} variant="outline" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleTestVoice(profile)}
                            >
                              <Volume2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingProfile(profile)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteProfile(profile.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="assignment" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Assignment Strategy</Label>
                  <Select
                    value={selectedStrategy.type}
                    onValueChange={(value: VoiceAssignmentStrategy["type"]) =>
                      setSelectedStrategy({ type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="characteristic-match">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon("characteristic-match")}
                          <span>Characteristic Matching</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="role-based">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon("role-based")}
                          <span>Role-based</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="round-robin">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon("round-robin")}
                          <span>Round Robin</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="random">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon("random")}
                          <span>Random</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="manual">
                        <div className="flex items-center gap-2">
                          {getStrategyIcon("manual")}
                          <span>Manual Selection</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedStrategy.type === "manual" && (
                  <div>
                    <Label>Select Profile</Label>
                    <Select
                      value={selectedProfileId}
                      onValueChange={setSelectedProfileId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a voice profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((profile) => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">
                    Strategy Description:
                  </p>
                  {selectedStrategy.type === "characteristic-match" && (
                    <p className="text-sm">
                      Matches voice characteristics to agent personality and role for the best fit.
                    </p>
                  )}
                  {selectedStrategy.type === "role-based" && (
                    <p className="text-sm">
                      Assigns voices based on agent roles and responsibilities.
                    </p>
                  )}
                  {selectedStrategy.type === "round-robin" && (
                    <p className="text-sm">
                      Distributes voices evenly across all agents in sequence.
                    </p>
                  )}
                  {selectedStrategy.type === "random" && (
                    <p className="text-sm">
                      Randomly assigns available voices to agents.
                    </p>
                  )}
                  {selectedStrategy.type === "manual" && (
                    <p className="text-sm">
                      Manually select specific voice profiles for agents.
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleAssignVoices}
                  className="w-full"
                  disabled={
                    selectedStrategy.type === "manual" && !selectedProfileId
                  }
                >
                  <Wand2 className="h-4 w-4 mr-2" />
                  Assign Voices to All Agents
                </Button>
              </div>

              {agents.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Current Agent Assignments</h4>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {agents.map((agent) => {
                        const profile = voiceProfileManager.getAgentVoiceProfile(agent.id);
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center justify-between p-2 rounded border"
                          >
                            <span className="text-sm font-medium">{agent.name}</span>
                            {profile ? (
                              <Badge variant="outline">{profile.name}</Badge>
                            ) : (
                              <Badge variant="secondary">No voice assigned</Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Voice Usage Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.from(voiceProfileManager.getVoiceUsageStatistics()).map(
                      ([profileId, count]) => {
                        const profile = voiceProfileManager.getProfile(profileId);
                        if (!profile) return null;
                        
                        return (
                          <div
                            key={profileId}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm">{profile.name}</span>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{count} agents</Badge>
                              <div
                                className="h-2 bg-primary rounded"
                                style={{
                                  width: `${Math.min(count * 20, 100)}px`,
                                }}
                              />
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}