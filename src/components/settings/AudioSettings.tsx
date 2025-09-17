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
  useCallSettings,
  type InterruptionMode,
  type InterruptionSensitivity,
  type VADMode,
} from "@/stores/call-settings-store";
import { useAudioDevices } from "@/hooks/useAudioDevices";
import { useChromeSpeechRecognition } from "@/hooks/useChromeSpeechRecognition";
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
  const { audioSettings, updateAudioSettings } = useCallSettings();
  const { inputDevices, outputDevices, isLoading, refreshDevices } =
    useAudioDevices();

  // Testing states
  const [isTestingInput, setIsTestingInput] = useState(false);
  const [isTestingOutput, setIsTestingOutput] = useState(false);
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [speechTestResult, setSpeechTestResult] = useState<string>("");

  // Refs for testing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Chrome speech recognition for testing
  const {
    fullTranscript,
    isSupported: isSpeechSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useChromeSpeechRecognition();

  // Update speech test result when transcript changes
  useEffect(() => {
    if (fullTranscript) {
      setSpeechTestResult(fullTranscript);
    }
  }, [fullTranscript]);

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

  // Test speech recognition
  const testSpeechRecognition = useCallback(() => {
    if (isTestingSpeech) {
      stopListening();
      setIsTestingSpeech(false);
      setSpeechTestResult("");
      resetTranscript();
    } else {
      setIsTestingSpeech(true);
      setSpeechTestResult("Listening...");
      startListening();
    }
  }, [isTestingSpeech, startListening, stopListening, resetTranscript]);

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
          
          {audioSettings.vadMode === "auto" && (
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
        </CardContent>
      </Card>

      {/* Speech recognition test */}
      <Card>
        <CardHeader>
          <CardTitle>Speech Recognition Test</CardTitle>
          <CardDescription>
            Test browser speech recognition capabilities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSpeechSupported ? (
            <div className="space-y-2">
              <Button
                size="sm"
                variant={isTestingSpeech ? "destructive" : "outline"}
                onClick={testSpeechRecognition}
                className="gap-2 w-full"
              >
                {isTestingSpeech ? (
                  <>
                    <Square className="h-3 w-3" />
                    Stop Recognition Test
                  </>
                ) : (
                  <>
                    <Activity className="h-3 w-3" />
                    Test Browser Speech Recognition
                  </>
                )}
              </Button>

              {speechTestResult && (
                <div className="p-3 bg-secondary rounded-lg">
                  <p className="text-sm">{speechTestResult}</p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Browser speech recognition not supported. Audio will be
              transcribed using Whisper.
            </p>
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