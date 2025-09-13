import { useState, useEffect, useCallback } from "react";

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

export function useAudioDevices() {
  const [inputDevices, setInputDevices] = useState<AudioDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<AudioDevice[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Request permissions first to get device labels
      await navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          // Immediately stop the stream after getting permission
          stream.getTracks().forEach((track) => track.stop());
        });

      const devices = await navigator.mediaDevices.enumerateDevices();

      const audioInputs = devices
        .filter((device) => device.kind === "audioinput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}`,
          kind: "audioinput" as const,
        }));

      const audioOutputs = devices
        .filter((device) => device.kind === "audiooutput")
        .map((device) => ({
          deviceId: device.deviceId,
          label: device.label || `Speaker ${device.deviceId.slice(0, 5)}`,
          kind: "audiooutput" as const,
        }));

      setInputDevices(audioInputs);
      setOutputDevices(audioOutputs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to enumerate devices",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and device change listener
  useEffect(() => {
    refreshDevices();

    // Listen for device changes
    const handleDeviceChange = () => {
      refreshDevices();
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        handleDeviceChange,
      );
    };
  }, [refreshDevices]);

  return {
    inputDevices,
    outputDevices,
    refreshDevices,
    error,
    isLoading,
  };
}

// Helper to apply audio constraints to a media stream
export function applyAudioConstraints(
  stream: MediaStream,
  settings: {
    noiseSuppression?: boolean;
    echoCancellation?: boolean;
    autoGainControl?: boolean;
  },
) {
  const audioTrack = stream.getAudioTracks()[0];
  if (!audioTrack) return;

  const constraints = audioTrack.getConstraints();
  audioTrack.applyConstraints({
    ...constraints,
    noiseSuppression: settings.noiseSuppression,
    echoCancellation: settings.echoCancellation,
    autoGainControl: settings.autoGainControl,
  });
}
