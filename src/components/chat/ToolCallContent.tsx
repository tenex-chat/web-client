import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { Tool } from "@/components/ai-elements/tool";
import { useMemo } from "react";

interface ToolCallContentProps {
  event: NDKEvent;
}

export function ToolCallContent({ event }: ToolCallContentProps) {
  // Parse tool information from event tags
  const toolData = useMemo(() => {
    const toolTag = event.tags.find(tag => tag[0] === "tool");
    if (!toolTag) return null;

    // Tool tag format: ["tool", name, description?, status?, parameters?, result?]
    const [, name, description, status, parametersStr, resultStr] = toolTag;
    
    let parameters: Record<string, any> | undefined;
    let result: any | undefined;
    
    try {
      if (parametersStr) {
        parameters = JSON.parse(parametersStr);
      }
    } catch (e) {
      // If not valid JSON, treat as string
      parameters = { value: parametersStr };
    }
    
    try {
      if (resultStr) {
        result = JSON.parse(resultStr);
      }
    } catch (e) {
      // If not valid JSON, treat as string
      result = resultStr;
    }

    // Also check for error tag
    const errorTag = event.tags.find(tag => tag[0] === "error");
    const error = errorTag?.[1];

    return {
      name: name || "Unknown Tool",
      description,
      status: (status as "pending" | "running" | "completed" | "failed") || "completed",
      parameters,
      result,
      error
    };
  }, [event]);

  if (!toolData) {
    return null;
  }

  return <Tool {...toolData} />;
}