import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LLMMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadata: Record<string, string>;
}

export function LLMMetadataDialog({
  open,
  onOpenChange,
  metadata,
}: LLMMetadataDialogProps) {
  const formatKey = (key: string) => {
    return key
      .replace("llm-", "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatValue = (key: string, value: string) => {
    // Format token numbers with commas
    if (key.includes("tokens") || key === "llm-context-window") {
      return parseInt(value).toLocaleString();
    }

    // Format cost values
    if (key.includes("cost")) {
      if (key === "llm-cost-usd") {
        return `$${value}`;
      }
      return value;
    }

    // Truncate very long values (like prompts or raw responses)
    if (key.includes("prompt") || key === "llm-raw-response") {
      if (value.length > 500) {
        return value.substring(0, 500) + "...";
      }
    }

    return value;
  };

  // Organize metadata into sections
  const modelInfo = Object.entries(metadata).filter(
    ([key]) => key === "llm-model" || key === "llm-provider",
  );

  const tokenInfo = Object.entries(metadata).filter(
    ([key]) => key.includes("tokens") || key === "llm-context-window",
  );

  const costInfo = Object.entries(metadata).filter(([key]) =>
    key.includes("cost"),
  );

  const promptInfo = Object.entries(metadata).filter(([key]) =>
    key.includes("prompt"),
  );

  const otherInfo = Object.entries(metadata).filter(
    ([key]) =>
      !modelInfo.some(([k]) => k === key) &&
      !tokenInfo.some(([k]) => k === key) &&
      !costInfo.some(([k]) => k === key) &&
      !promptInfo.some(([k]) => k === key),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>LLM Metadata</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Model Information */}
            {modelInfo.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">
                  Model Information
                </h3>
                <div className="space-y-1">
                  {modelInfo.map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatKey(key)}:
                      </span>
                      <span className="font-mono">
                        {formatValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Token Usage */}
            {tokenInfo.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Token Usage</h3>
                <div className="space-y-1">
                  {tokenInfo.map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatKey(key)}:
                      </span>
                      <span className="font-mono">
                        {formatValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cost Information */}
            {costInfo.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Cost</h3>
                <div className="space-y-1">
                  {costInfo.map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatKey(key)}:
                      </span>
                      <span className="font-mono text-green-600">
                        {formatValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Prompts */}
            {promptInfo.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Prompts</h3>
                <div className="space-y-2">
                  {promptInfo.map(([key, value]) => (
                    <div key={key}>
                      <div className="text-sm text-muted-foreground mb-1">
                        {formatKey(key)}:
                      </div>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {formatValue(key, value)}
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Other Information */}
            {otherInfo.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Other</h3>
                <div className="space-y-1">
                  {otherInfo.map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatKey(key)}:
                      </span>
                      <span className="font-mono">
                        {formatValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
