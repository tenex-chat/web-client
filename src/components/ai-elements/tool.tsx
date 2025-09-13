"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code2, Terminal, Wrench } from "lucide-react";

interface ToolProps extends ComponentProps<"div"> {
  name: string;
  description?: string;
  status?: "pending" | "running" | "completed" | "failed";
  parameters?: Record<string, any>;
  result?: any;
  error?: string;
}

export const Tool = memo(
  ({ className, name, description, status = "completed", parameters, result, error, ...props }: ToolProps) => {
    const getStatusColor = () => {
      switch (status) {
        case "pending":
          return "bg-muted text-muted-foreground";
        case "running":
          return "bg-blue-500/10 text-blue-600 dark:text-blue-400";
        case "completed":
          return "bg-green-500/10 text-green-600 dark:text-green-400";
        case "failed":
          return "bg-red-500/10 text-red-600 dark:text-red-400";
        default:
          return "bg-muted text-muted-foreground";
      }
    };

    return (
      <Card className={cn("my-2", className)} {...props}>
        <CardHeader className="p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-xs text-muted-foreground font-medium">{name}</CardTitle>
            </div>
            {/* <Badge variant="secondary" className={cn("text-xs", getStatusColor())}>
              <span className="flex items-center gap-1">
                {getStatusIcon()}
                {status}
              </span>
            </Badge> */}
          </div>
          {description && (
            <CardDescription className="text-xs mt-1">{description}</CardDescription>
          )}
        </CardHeader>
        
        {(parameters || result || error) && (
          <CardContent className="pt-0">
            {parameters && Object.keys(parameters).length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <Terminal className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Parameters</span>
                </div>
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                  <code>{JSON.stringify(parameters, null, 2)}</code>
                </pre>
              </div>
            )}
            
            {result && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-1">
                  <Code2 className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Result</span>
                </div>
                <div className="text-xs bg-muted rounded p-2 overflow-x-auto">
                  {typeof result === "string" ? (
                    <div className="whitespace-pre-wrap">{result}</div>
                  ) : (
                    <pre>
                      <code>{JSON.stringify(result, null, 2)}</code>
                    </pre>
                  )}
                </div>
              </div>
            )}
            
            {error && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-xs font-medium text-red-600 dark:text-red-400">Error</span>
                </div>
                <div className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 rounded p-2">
                  {error}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }
);

Tool.displayName = "Tool";