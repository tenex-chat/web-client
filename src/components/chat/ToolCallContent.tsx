import { NDKEvent } from "@nostr-dev-kit/ndk-hooks";
import { Tool } from "@/components/ai-elements/tool";
import { useMemo } from "react";

interface ToolCallContentProps {
  event: NDKEvent;
}

export function ToolCallContent({ event }: ToolCallContentProps) {
  // Parse tool information from event tags
  const toolData = useMemo(() => {
    const toolTag = event.hasTag("tool")
    if (!toolTag) return null;

    const title = event.tagValue("tool-title");
    const name = toolTag[1];
    
    let parameters: Record<string, any> | undefined;
    let result: any | undefined;
    
    return {
					name: title ? title : event.content,
					description: title && event.content,
					parameters,
					result,
				};
  }, [event]);

  if (!toolData) {
    return null;
  }

  if (!toolData.name) {
    return <span className="text-xs text-muted-foreground">
      {event.content}
    </span>
  }
  
  return <Tool {...toolData} />;
}