import { useState, useRef, useCallback, useEffect } from "react";
import {
  Volume2,
  Mic,
  Play,
  Square,
  TestTube,
  Activity,
  Headphones,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAudioSettings,
  type InterruptionMode,
  type InterruptionSensitivity,
  type VADMode,
} from "@/stores/ai-config-store";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export function AudioSettings() {
  const { audioSettings, updateAudioSettings } = useAudioSettings();
  const { inputDevices, outputDevices, isLoading, refreshDevices } =
    useAudioDevices();

  // Provide default audio settings if not loaded yet
  const settings = audioSettings || {
    inputDeviceId: null,
    outputDeviceId: null,
    inputVolume: 100,
    noiseSuppression: true,
    echoCancellation: true,
    voiceActivityDetection: true,
    vadSensitivity: 50,
    vadMode: 'push-to-talk' as VADMode,
    interruptionMode: 'disabled' as InterruptionMode,
    interruptionSensitivity: 'medium' as InterruptionSensitivity
  };

  // Testing states
  const [isTestingInput, setIsTestingInput] = useState(false);
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);

  // Refs for testing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Test input device
  const testInputDevice = useCallback(async () => {
    if (isTestingInput) {
      // Stop testing
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      setIsTestingInput(false);
      setInputLevel(0);
      return;
    }

    try {
      console.log("Starting mic test with device:", settings.inputDeviceId);
      setIsTestingInput(true);

      const constraints: MediaStreamConstraints = {
        audio: settings.inputDeviceId
          ? {
              deviceId: { exact: settings.inputDeviceId },
              noiseSuppression: settings.noiseSuppression,
              echoCancellation: settings.echoCancellation,
              autoGainControl: settings.voiceActivityDetection,
            }
          : {
              noiseSuppression: settings.noiseSuppression,
              echoCancellation: settings.echoCancellation,
              autoGainControl: settings.voiceActivityDetection,
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      console.log("Got media stream:", stream.getAudioTracks()[0]?.label);

      // Create audio context and analyser
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Monitor audio levels
      analyserRef.current.fftSize = 256;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateLevel = () => {
        if (!analyserRef.current || !streamRef.current) return;

        analyserRef.current.getByteTimeDomainData(dataArray);

        // Calculate RMS (Root Mean Square) for better volume representation
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / bufferLength);

        // Convert to percentage (0-100) with input volume consideration
        const normalizedLevel = Math.min(100, rms * 100 * 2 * (settings.inputVolume / 100));
        setInputLevel(normalizedLevel);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      console.log("Starting audio level monitoring");
      updateLevel();
    } catch (error) {
      console.error("Failed to access microphone:", error);
      toast.error(`Failed to access microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsTestingInput(false);
    }
  }, [settings]);

  // Test output device
  const testOutputDevice = useCallback(async () => {
    if (isTestingOutput) return;

    setIsTestingOutput(true);

    try {
      // Create a test tone
      const audioContext = new AudioContext();

      // Set the output device if specified
      if (settings.outputDeviceId && audioContext.setSinkId) {
        await audioContext.setSinkId(settings.outputDeviceId);
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.1; // Low volume

      oscillator.start();

      // Stop after 1 second
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
        setIsTestingOutput(false);
        toast.success("Test tone played");
      }, 1000);
    } catch (error) {
      console.error("Failed to play test tone:", error);
      toast.error("Failed to play test tone");
      setIsTestingOutput(false);
    }
  }, [settings.outputDeviceId]);

  // Test speech recognition

  return (
    <div className="space-y-6">
      {/* Input device section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Microphone Settings
          </CardTitle>
          <CardDescription>
            Configure your microphone and input settings for calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Microphone Device</Label>
            <Select
              value={settings.inputDeviceId || "default"}
              onValueChange={(value) =>
                updateAudioSettings({
                  inputDeviceId: value === "default" ? null : value,
                })
              }
              disabled={isLoading || inputDevices.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select microphone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                {inputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Input test button and level meter */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isTestingInput ? "destructive" : "outline"}
                onClick={testInputDevice}
                className="gap-2"
              >
                {isTestingInput ? (
                  <>
                    <Square className="h-3 w-3" />
                    Stop Test
                  </>
                ) : (
                  <>
                    <TestTube className="h-3 w-3" />
                    Test Mic
                  </>
                )}
              </Button>

              {isTestingInput && (
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-100"
                    style={{ width: `${inputLevel}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Input volume */}
          <div className="space-y-2">
            <Label>Input Volume: {settings.inputVolume}%</Label>
            <Slider
              value={[settings.inputVolume]}
              onValueChange={([value]) =>
                updateAudioSettings({ inputVolume: value })
              }
              min={0}
              max={100}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Output device section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Speaker Settings
          </CardTitle>
          <CardDescription>
            Configure your speaker and output settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Speaker Device</Label>
            <Select
              value={settings.outputDeviceId || "default"}
              onValueChange={(value) =>
                updateAudioSettings({
                  outputDeviceId: value === "default" ? null : value,
                })
              }
              disabled={isLoading || outputDevices.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select speaker" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">System Default</SelectItem>
                {outputDevices.map((device) => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Output test button */}
            <Button
              size="sm"
              variant="outline"
              onClick={testOutputDevice}
              disabled={isTestingOutput}
              className="gap-2"
            >
              <Play className="h-3 w-3" />
              {isTestingOutput ? "Playing..." : "Test Speaker"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Audio processing */}
      <Card>
        <CardHeader>
          <CardTitle>Audio Processing</CardTitle>
          <CardDescription>
            Configure noise suppression and echo cancellation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="noise-suppression">Noise Suppression</Label>
            <Switch
              id="noise-suppression"
              checked={settings.noiseSuppression}
              onCheckedChange={(checked) =>
                updateAudioSettings({ noiseSuppression: checked })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="echo-cancellation">Echo Cancellation</Label>
            <Switch
              id="echo-cancellation"
              checked={settings.echoCancellation}
              onCheckedChange={(checked) =>
                updateAudioSettings({ echoCancellation: checked })
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="vad">Voice Activity Detection</Label>
              <Switch
                id="vad"
                checked={settings.voiceActivityDetection}
                onCheckedChange={(checked) =>
                  updateAudioSettings({ voiceActivityDetection: checked })
                }
              />
            </div>

            {settings.voiceActivityDetection && (
              <div className="pl-4 space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Sensitivity: {settings.vadSensitivity}%
                </Label>
                <Slider
                  value={[settings.vadSensitivity]}
                  onValueChange={([value]) =>
                    updateAudioSettings({ vadSensitivity: value })
                  }
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  Lower = more sensitive to voice
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Conversation Mode */}
      <Card>
        <CardHeader>
          <CardTitle>Conversation Mode</CardTitle>
          <CardDescription>
            Choose how the system detects when you're speaking during calls
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={settings.vadMode}
            onValueChange={(value) =>
              updateAudioSettings({ vadMode: value as VADMode })
            }
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="auto" id="vad-auto" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="vad-auto" className="font-normal cursor-pointer">
                  Auto-detect speech
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically detects when you start/stop speaking
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <RadioGroupItem value="push-to-talk" id="vad-ptt" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="vad-ptt" className="font-normal cursor-pointer">
                  Push-to-talk with silence detection
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tap mic to start, auto-send after 2s silence
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <RadioGroupItem value="disabled" id="vad-disabled" className="mt-1" />
              <div className="space-y-1">
                <Label htmlFor="vad-disabled" className="font-normal cursor-pointer">
                  Manual control only
                </Label>
                <p className="text-xs text-muted-foreground">
                  Tap mic to start, tap Send to finish (no auto-send)
                </p>
              </div>
            </div>
          </RadioGroup>
          
          {settings.vadMode === "auto" && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                💡 In auto mode, just start speaking naturally. The system will detect when you pause.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interruption settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Headphones className="h-4 w-4" />
            Interruption Mode
          </CardTitle>
          <CardDescription>
            Configure how interruptions work during calls
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={settings.interruptionMode}
            onValueChange={(value) =>
              updateAudioSettings({
                interruptionMode: value as InterruptionMode,
              })
            }
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="disabled"
                id="disabled"
                className="mt-1"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="disabled"
                  className="font-normal cursor-pointer"
                >
                  No interruption
                </Label>
                <p className="text-xs text-muted-foreground">
                  Manual pause only - tap speaking agent to pause
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <RadioGroupItem
                value="headphones"
                id="headphones"
                className="mt-1"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="headphones"
                  className="font-normal cursor-pointer"
                >
                  Headphones mode
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable interruption (requires headphones to avoid echo)
                </p>
              </div>
            </div>
          </RadioGroup>

          {settings.interruptionMode === "headphones" && (
            <div className="pl-4 space-y-3 pt-2">
              <div className="space-y-2">
                <Label>Interruption Sensitivity</Label>
                <Select
                  value={settings.interruptionSensitivity}
                  onValueChange={(value) =>
                    updateAudioSettings({
                      interruptionSensitivity:
                        value as InterruptionSensitivity,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      Conservative (5+ words)
                    </SelectItem>
                    <SelectItem value="medium">
                      Balanced (3+ words)
                    </SelectItem>
                    <SelectItem value="high">
                      Responsive (any speech)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Lower sensitivity reduces false interruptions
                </p>
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-xs text-yellow-600 dark:text-yellow-400">
                  ⚠️ Headphones required to prevent audio feedback
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Refresh devices button */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="outline"
            onClick={refreshDevices}
            disabled={isLoading}
            className="w-full"
          >
            Refresh Devices
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}