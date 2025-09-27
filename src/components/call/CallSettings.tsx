import { useState, useRef, useCallback, useEffect } from "react";
import {
  Settings,
  Volume2,
  Mic,
  Play,
  Square,
  TestTube,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface CallSettingsProps {
  className?: string;
}

export function CallSettings({ className }: CallSettingsProps) {
  const { audioSettings, updateAudioSettings } = useAudioSettings();
  const { inputDevices, outputDevices, isLoading, refreshDevices } =
    useAudioDevices();

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
      setIsTestingInput(false);
      setInputLevel(0);
      return;
    }

    try {
      setIsTestingInput(true);

      const constraints: MediaStreamConstraints = {
        audio: audioSettings.inputDeviceId
          ? {
              deviceId: { exact: audioSettings.inputDeviceId },
              noiseSuppression: audioSettings.noiseSuppression,
              echoCancellation: audioSettings.echoCancellation,
              autoGainControl: audioSettings.voiceActivityDetection,
            }
          : {
              noiseSuppression: audioSettings.noiseSuppression,
              echoCancellation: audioSettings.echoCancellation,
              autoGainControl: audioSettings.voiceActivityDetection,
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Create audio context and analyser
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);

      // Monitor audio levels
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current || !isTestingInput) return;

        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = Math.min(
          100,
          (average / 128) * 100 * (audioSettings.inputVolume / 100),
        );
        setInputLevel(normalizedLevel);

        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch {
      toast.error("Failed to access microphone");
      setIsTestingInput(false);
    }
  }, [isTestingInput, audioSettings]);

  // Test output device
  const testOutputDevice = useCallback(() => {
    if (isTestingOutput) return;

    setIsTestingOutput(true);

    // Create a test tone
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 440; // A4 note
    gainNode.gain.value = 0.1; // Low volume

    oscillator.start();

    // Play test audio if output device is selected
    if (audioSettings.outputDeviceId) {
      const audio = new Audio();
      audio.setSinkId?.(audioSettings.outputDeviceId);

      // Create a simple beep sound
      const oscillatorNode = audioContext.createOscillator();
      const gainNodeForBeep = audioContext.createGain();
      oscillatorNode.connect(gainNodeForBeep);
      gainNodeForBeep.connect(audioContext.destination);
      oscillatorNode.frequency.value = 800;
      gainNodeForBeep.gain.value = 0.2;
      oscillatorNode.start();
      oscillatorNode.stop(audioContext.currentTime + 0.2);
    }

    setTimeout(() => {
      oscillator.stop();
      audioContext.close();
      setIsTestingOutput(false);
      toast.success("Test tone played");
    }, 1000);
  }, [isTestingOutput, audioSettings.outputDeviceId]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("rounded-full", className)}
          aria-label="Open audio settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Audio Settings</SheetTitle>
          <SheetDescription>
            Configure your microphone, speaker, and audio processing settings
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Input device section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Microphone
              </Label>
              <Select
                value={audioSettings.inputDeviceId || "default"}
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
              <Label>Input Volume: {audioSettings.inputVolume}%</Label>
              <Slider
                value={[audioSettings.inputVolume]}
                onValueChange={([value]) =>
                  updateAudioSettings({ inputVolume: value })
                }
                min={0}
                max={100}
                step={1}
              />
            </div>
          </div>

          <Separator />

          {/* Output device section */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Speaker
              </Label>
              <Select
                value={audioSettings.outputDeviceId || "default"}
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
          </div>

          <Separator />

          {/* Audio processing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Audio Processing</h3>

            <div className="flex items-center justify-between">
              <Label htmlFor="noise-suppression">Noise Suppression</Label>
              <Switch
                id="noise-suppression"
                checked={audioSettings.noiseSuppression}
                onCheckedChange={(checked) =>
                  updateAudioSettings({ noiseSuppression: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="echo-cancellation">Echo Cancellation</Label>
              <Switch
                id="echo-cancellation"
                checked={audioSettings.echoCancellation}
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
                  checked={audioSettings.voiceActivityDetection}
                  onCheckedChange={(checked) =>
                    updateAudioSettings({ voiceActivityDetection: checked })
                  }
                />
              </div>

              {audioSettings.voiceActivityDetection && (
                <div className="pl-4 space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Sensitivity: {audioSettings.vadSensitivity}%
                  </Label>
                  <Slider
                    value={[audioSettings.vadSensitivity]}
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
          </div>

          <Separator />

          {/* VAD Mode for conversation flow */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Conversation Mode</h3>
            
            <RadioGroup
              value={audioSettings.vadMode}
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
                    Tap mic to start, auto-send after 2s silence (current behavior)
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
            
            {audioSettings.vadMode === "auto" && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  💡 In auto mode, just start speaking naturally. The system will detect when you pause.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Interruption settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Headphones className="h-4 w-4" />
              Interruption Mode
            </h3>

            <RadioGroup
              value={audioSettings.interruptionMode}
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

            {audioSettings.interruptionMode === "headphones" && (
              <div className="pl-4 space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>Interruption Sensitivity</Label>
                  <Select
                    value={audioSettings.interruptionSensitivity}
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
          </div>

          <Separator />

          {/* Refresh devices button */}
          <div className="pt-4">
            <Button
              variant="outline"
              onClick={refreshDevices}
              disabled={isLoading}
              className="w-full"
            >
              Refresh Devices
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
