import { useState, useRef, useEffect } from "react";
import { Square, Edit2, Check, X, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import NDKBlossom from "@nostr-dev-kit/ndk-blossom";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useAI } from "@/hooks/useAI";
import { toast } from "sonner";
import { UPLOAD_LIMITS } from "@/lib/constants";

interface VoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (data: {
    transcription: string;
    audioUrl?: string;
    duration?: number;
    autoSend?: boolean;
  }) => void;
  conversationId?: string;
  projectId?: string;
  replyToId?: string;
  mentionedAgents?: string[];
  publishAudioEvent?: boolean; // Whether to publish NIP-94 event
  autoRecordAndSend?: boolean; // Auto-record on open and send after transcription
}

export function VoiceDialog({
  open,
  onOpenChange,
  onComplete,
  conversationId,
  projectId,
  replyToId,
  mentionedAgents,
  publishAudioEvent = false,
  autoRecordAndSend = false,
}: VoiceDialogProps) {
  const { ndk } = useNDK();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [editedTranscription, setEditedTranscription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [uploadedAudioUrl, setUploadedAudioUrl] = useState<string | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { transcribe, cleanupText, hasSTT, sttSettings } = useAI();
  
  // Use the new audio recorder hook
  const {
    isRecording,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    audioLevel,
    error: recordingError,
  } = useAudioRecorder({
    onDataAvailable: (data) => {
      // Update waveform data
      const maxAmplitude = Math.max(...data.map(Math.abs));
      if (maxAmplitude > 0.01) {
        setWaveformData(prev => {
          const newData = [...prev, maxAmplitude];
          return newData.slice(-100); // Keep last 100 samples
        });
      }
    },
  });

  const updateDuration = () => {
    if (isRecording && startTimeRef.current > 0) {
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setRecordingDuration(duration);
      animationFrameRef.current = requestAnimationFrame(updateDuration);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !isRecording) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      if (!isRecording) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw waveform bars based on audio level
      const barCount = 20;
      const barWidth = canvas.width / barCount - 2;
      
      for (let i = 0; i < barCount; i++) {
        // Create animated bars based on audio level
        const variance = Math.random() * 0.5 + 0.5;
        const barHeight = audioLevel * canvas.height * 0.8 * variance;
        const x = i * (barWidth + 2);
        const y = (canvas.height - barHeight) / 2;

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, "rgba(239, 68, 68, 0.8)");
        gradient.addColorStop(1, "rgba(239, 68, 68, 0.3)");

        ctx.fillStyle = gradient;
        ctx.beginPath();

        if (ctx.roundRect) {
          ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        } else {
          ctx.rect(x, y, barWidth, barHeight);
        }
        ctx.fill();
      }

      if (isRecording) {
        requestAnimationFrame(draw);
      }
    };

    draw();
  };

  const stopRecording = async () => {
    const blob = await stopAudioRecording();
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }
    
    const finalDuration = Math.floor(
      (Date.now() - startTimeRef.current) / 1000,
    );
    setRecordingDuration(finalDuration);
    
    if (blob) {
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    }
  };

  // Cleanup when dialog closes
  useEffect(() => {
    if (!open) {
      // Dialog is closing, ensure we stop recording
      if (isRecording) {
        stopRecording();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    }
  }, [open]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isRecording) {
        stopAudioRecording();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording && startTimeRef.current > 0) {
      updateDuration();
      drawWaveform();
    }
  }, [isRecording]);

  useEffect(() => {
    if (open && !isRecording && !audioBlob) {
      const timer = setTimeout(() => {
        startRecording();
      }, 100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, isRecording, audioBlob]);

  // Auto-process when recording stops in auto mode
  useEffect(() => {
    if (autoRecordAndSend && audioBlob && !isProcessing && !transcription) {
      handleProcess();
    }
  }, [autoRecordAndSend, audioBlob, isProcessing, transcription]);

  // Auto-send when transcription is ready in auto mode
  useEffect(() => {
    if (autoRecordAndSend && transcription && !isProcessing) {
      // Send immediately without showing the edit UI
      onComplete({
        transcription: transcription,
        audioUrl: uploadedAudioUrl,
        duration: recordingDuration,
        autoSend: true,
      });
      resetState();
    }
  }, [autoRecordAndSend, transcription, isProcessing, uploadedAudioUrl, recordingDuration]);

  const startRecording = async () => {
    try {
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingDuration(0);
      setTranscription("");
      setEditedTranscription("");
      setIsEditing(false);
      setWaveformData([]);

      startTimeRef.current = Date.now();
      await startAudioRecording();
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error(recordingError || "Failed to start recording");
    }
  };

  const handleProcess = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);

    try {
      // Check STT availability first
      if (!hasSTT) {
        let errorMsg = "Speech-to-text not configured properly.";
        
        if (!sttSettings.enabled) {
          errorMsg = "Speech-to-text is disabled. Please enable it in Settings > AI";
        } else {
          switch (sttSettings.provider) {
            case "whisper":
              errorMsg = "OpenAI API key not configured. Please configure it in Settings > AI";
              break;
            case "elevenlabs":
              errorMsg = "ElevenLabs API key not configured. Please configure it in Settings > AI";
              break;
          }
        }
        
        toast.error(errorMsg, {
          duration: 5000,
          action: {
            label: "Go to Settings",
            onClick: () => {
              window.location.href = "/#/settings?tab=ai";
            },
          },
        });
        setIsProcessing(false);
        return;
      }

      // Run transcription and upload in parallel but handle failures independently
      const transcriptionPromise = transcribe(audioBlob).catch((error) => {
        console.error("Transcription failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to transcribe audio";
        
        // Show detailed error message with action button for API key issues
        if (errorMessage.includes("API key")) {
          toast.error(errorMessage, {
            duration: 6000,
            action: {
              label: "Fix Settings",
              onClick: () => {
                window.location.href = "/#/settings?tab=ai";
              },
            },
          });
        } else if (errorMessage.includes("rate limit")) {
          const provider = sttSettings.provider === "elevenlabs" ? "ElevenLabs" : "OpenAI";
          toast.error(`${provider} rate limit exceeded. Please try again later.`, {
            duration: 5000,
          });
        } else {
          toast.error(errorMessage, { duration: 5000 });
        }
        
        // Return null to allow upload to continue even if transcription fails
        return null;
      });

      const blossom = new NDKBlossom(ndk!);
      const audioFile = new File(
        [audioBlob],
        `voice-recording-${Date.now()}.webm`,
        {
          type: audioBlob.type || "audio/webm",
        },
      );
      const uploadPromise = blossom
        .upload(audioFile, {
          server: "https://blossom.primal.net",
          maxRetries: UPLOAD_LIMITS.MAX_RETRY_COUNT,
        })
        .catch((error) => {
          console.error("Audio upload failed:", error);
          toast.warning(
            "Audio upload failed, but transcription may still work",
          );
          return null;
        });

      const [rawTranscription, uploadResult] = await Promise.all([
        transcriptionPromise,
        uploadPromise,
      ]);

      // Check if we got at least transcription
      if (!rawTranscription && !uploadResult?.url) {
        throw new Error("Both transcription and upload failed");
      }

      if (rawTranscription) {
        const cleanedText = await cleanupText(rawTranscription);
        setTranscription(cleanedText);
        setEditedTranscription(cleanedText);
      } else {
        // If transcription failed but upload succeeded, inform user
        toast.warning(
          "Transcription failed, but audio was uploaded successfully",
        );
      }

      if (uploadResult?.url) {
        setUploadedAudioUrl(uploadResult.url);
      }

      setIsProcessing(false);
    } catch (error) {
      console.error("Error during processing:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process recording";
      toast.error(errorMessage, {
        duration: 5000,
        description: "Please check your API key settings and try again",
      });
      setIsProcessing(false);
    }
  };

  const handleSubmit = async () => {
    const finalTranscription = isEditing ? editedTranscription : transcription;

    if (finalTranscription.trim() && uploadedAudioUrl && audioBlob) {
      // Publish NIP-94 event if requested
      if (publishAudioEvent && ndk) {
        try {
          // Create event manually
          const event = new NDKEvent(ndk);
          event.kind = 1063;
          event.content = finalTranscription;
          event.tags = [];

          // Add NIP-94 tags
          event.tags.push(["url", uploadedAudioUrl]);
          event.tags.push(["m", audioBlob.type || "audio/webm"]);

          // Calculate hash
          const arrayBuffer = await audioBlob.arrayBuffer();
          const hash = Array.from(new Uint8Array(arrayBuffer))
            .slice(0, 32) // Just use first 32 bytes for simple hash
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
          event.tags.push(["x", hash.padEnd(64, "0")]);
          event.tags.push(["size", String(audioBlob.size)]);

          // Add optional tags
          if (recordingDuration > 0) {
            event.tags.push([
              "duration",
              String(Math.floor(recordingDuration)),
            ]);
          }

          if (waveformData.length > 0) {
            const waveformString = waveformData
              .map((v) => v.toFixed(2))
              .join(" ");
            event.tags.push(["waveform", waveformString]);
          }

          // Add conversation references
          if (conversationId) {
            if (replyToId) {
              event.tags.push(["e", replyToId, "", "reply"]);
              event.tags.push(["e", conversationId, "", "root"]);
            } else {
              event.tags.push(["e", conversationId]);
            }
          }

          if (projectId) {
            event.tags.push(["a", projectId]);
          }

          // Add agent mentions
          if (mentionedAgents) {
            for (const agentPubkey of mentionedAgents) {
              event.tags.push(["p", agentPubkey]);
            }
          }

          await event.publish();
          toast.success("Audio message published");
        } catch (error) {
          console.error("Failed to publish audio event:", error);
          toast.error("Failed to publish audio message");
        }
      }

      onComplete({
        transcription: finalTranscription,
        audioUrl: uploadedAudioUrl,
        duration: recordingDuration,
      });

      resetState();
      onOpenChange(false);
    }
  };

  const resetState = async () => {
    if (isRecording) {
      await stopRecording();
    }
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription("");
    setEditedTranscription("");
    setIsEditing(false);
    setRecordingDuration(0);
    setIsProcessing(false);
    setUploadedAudioUrl(null);
    setWaveformData([]);
  };

  const startEditing = () => {
    setIsEditing(true);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 50);
  };

  const cancelEditing = () => {
    setEditedTranscription(transcription);
    setIsEditing(false);
  };

  const confirmEdit = () => {
    setTranscription(editedTranscription);
    setIsEditing(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(newOpen) => {
        if (!newOpen) {
          // Dialog is closing - ensure cleanup
          resetState();
        }
        onOpenChange(newOpen);
      }}
    >
      <DialogContent className={cn(
        "w-full p-0 overflow-hidden",
        autoRecordAndSend ? "max-w-sm" : "max-w-lg"
      )}>
        <div className="px-6 py-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Voice Message</h2>
            {isRecording && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-500">
                  Recording
                </span>
              </div>
            )}
          </div>
        </div>

        {!audioBlob && !transcription && (
          <div className="px-6 py-8">
            <div className="flex flex-col items-center space-y-8">
              {!autoRecordAndSend && (
                <div className="w-full max-w-md">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={120}
                    className="w-full h-30 rounded-lg"
                    style={{ maxWidth: "100%", height: "auto" }}
                  />
                </div>
              )}

              <div className="text-center">
                <div className={cn(
                  "font-light tracking-tight tabular-nums",
                  autoRecordAndSend ? "text-4xl" : "text-5xl"
                )}>
                  {formatDuration(recordingDuration)}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {isRecording ? (autoRecordAndSend ? "Recording... Tap to send" : "Tap to stop recording") : "Initializing..."}
                </p>
              </div>

              <button
                onClick={stopRecording}
                className="relative group"
                disabled={!isRecording}
              >
                <div className={cn(
                  "bg-red-500 rounded-full flex items-center justify-center transition-all group-hover:scale-110 group-active:scale-95",
                  autoRecordAndSend ? "w-16 h-16" : "w-20 h-20"
                )}>
                  <Square className={cn(
                    "text-white fill-white",
                    autoRecordAndSend ? "w-6 h-6" : "w-8 h-8"
                  )} />
                </div>
                <div className={cn(
                  "absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25",
                  autoRecordAndSend ? "w-16 h-16" : "w-20 h-20"
                )} />
              </button>
            </div>
          </div>
        )}

        {audioBlob && !transcription && (
          <div className="px-6 py-8">
            {autoRecordAndSend ? (
              // Simpler UI for auto mode - just show processing state
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Processing your voice message...</p>
              </div>
            ) : (
              // Traditional UI with playback and options
              <div className="space-y-6">
                <div className="bg-muted rounded-xl p-4">
                  <audio controls src={audioUrl || ""} className="w-full" />
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span>Duration</span>
                    <span className="font-medium">
                      {formatDuration(recordingDuration)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetState();
                      startRecording();
                    }}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Re-record
                  </Button>
                  <Button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin mr-2" />
                        Processing
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {transcription && !autoRecordAndSend && (
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Transcription</h3>
                {!isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={startEditing}
                    className="gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    Edit
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    ref={textareaRef}
                    value={editedTranscription}
                    onChange={(e) => setEditedTranscription(e.target.value)}
                    className="min-h-[200px] resize-none"
                    placeholder="Edit your transcription..."
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {
                        editedTranscription
                          .split(" ")
                          .filter((w) => w.length > 0).length
                      }{" "}
                      words
                    </span>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={cancelEditing}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button variant="default" size="sm" onClick={confirmEdit}>
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="p-4 rounded-lg bg-muted cursor-pointer hover:bg-muted/80 transition-colors min-h-[200px]"
                  onClick={startEditing}
                >
                  <p className="text-sm whitespace-pre-wrap">{transcription}</p>
                  <p className="text-xs text-muted-foreground mt-4">
                    Tap to edit •{" "}
                    {
                      transcription.split(" ").filter((w) => w.length > 0)
                        .length
                    }{" "}
                    words
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => {
                  resetState();
                  onOpenChange(false);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isEditing || !transcription.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
