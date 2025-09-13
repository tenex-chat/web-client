import React from "react";
import { cn } from "@/lib/utils";

interface AsciiChartProps {
  content: string;
  className?: string;
}

/**
 * Component to render ASCII art charts with proper formatting
 */
export function AsciiChart({ content, className }: AsciiChartProps) {
  // Detect if content likely contains an ASCII chart
  const isLikelyChart = React.useMemo(() => {
    // Common ASCII chart characters
    const chartPatterns = [
      /[┌┐└┘├┤┬┴┼─│]/, // Box drawing characters
      /[╔╗╚╝╠╣╦╩╬═║]/, // Double box drawing
      /[→←↑↓↔↕]/, // Arrows
      /-->/, // Simple arrows
      /<--/,
      /\|\s*\|/, // Parallel vertical bars
      /\+-+\+/, // Box corners
      /\|[\s\w]+\|/, // Text in boxes
    ];

    return chartPatterns.some((pattern) => pattern.test(content));
  }, [content]);

  if (!isLikelyChart) {
    // Return content as-is if not a chart
    return (
      <pre className={cn("whitespace-pre-wrap font-mono text-xs", className)}>
        {content}
      </pre>
    );
  }

  // Process content to ensure proper alignment
  const lines = content.split("\n");
  const maxLength = Math.max(...lines.map((line) => line.length));

  // Pad lines to ensure consistent width
  const paddedLines = lines.map((line) => {
    const visibleLength = line.replace(
      /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
      "",
    ).length;
    return line + " ".repeat(Math.max(0, maxLength - visibleLength));
  });

  return (
    <div className={cn("my-4 overflow-x-auto", className)}>
      <pre
        className={cn(
          "inline-block min-w-full",
          "font-mono text-xs leading-relaxed",
          "bg-muted/30 dark:bg-muted/20",
          "border border-border rounded-lg",
          "p-4",
          "whitespace-pre",
          "select-text",
        )}
      >
        {paddedLines.join("\n")}
      </pre>
    </div>
  );
}

/**
 * Detects if a code block contains an ASCII chart
 */
export function detectAsciiChart(content: string, language?: string): boolean {
  // If explicitly marked as a chart or diagram
  if (
    language &&
    ["chart", "diagram", "ascii", "flowchart"].includes(language.toLowerCase())
  ) {
    return true;
  }

  // Count occurrences of chart-like patterns
  const indicators = [
    (content.match(/[┌┐└┘├┤┬┴┼─│╔╗╚╝╠╣╦╩╬═║]/g) || []).length,
    (content.match(/-->/g) || []).length,
    (content.match(/<--/g) || []).length,
    (content.match(/\+-+\+/g) || []).length,
    (content.match(/\|\s*\|/g) || []).length,
    (content.match(/[A-Z]\s*-->\s*[A-Z]/g) || []).length, // Node connections
  ];

  const totalIndicators = indicators.reduce((sum, count) => sum + count, 0);
  const lines = content.split("\n").length;

  // If we have a good ratio of chart characters to lines, it's likely a chart
  return totalIndicators > lines * 0.5;
}
