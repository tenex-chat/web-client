import React, { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { cn } from "@/lib/utils";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

// Function to get theme based on current mode
function getMermaidTheme() {
  const isDarkMode =
    typeof window !== "undefined" &&
    document.documentElement.classList.contains("dark");

  if (isDarkMode) {
    return {
      theme: "dark",
      themeVariables: {
        primaryColor: "#3b82f6",
        primaryTextColor: "#fff",
        primaryBorderColor: "#60a5fa",
        lineColor: "#6b7280",
        secondaryColor: "#7c3aed",
        tertiaryColor: "#fbbf24",
        background: "#111827",
        mainBkg: "#1f2937",
        secondBkg: "#374151",
        tertiaryBkg: "#4b5563",
        secondaryBorderColor: "#a78bfa",
        tertiaryBorderColor: "#fcd34d",
        labelBackground: "#1f2937",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        fontSize: "14px",
      },
    };
  } else {
    return {
      theme: "default",
      themeVariables: {
        primaryColor: "#3b82f6",
        primaryTextColor: "#1f2937",
        primaryBorderColor: "#60a5fa",
        lineColor: "#d1d5db",
        secondaryColor: "#7c3aed",
        tertiaryColor: "#fbbf24",
        background: "#ffffff",
        mainBkg: "#f9fafb",
        secondBkg: "#f3f4f6",
        tertiaryBkg: "#e5e7eb",
        secondaryBorderColor: "#a78bfa",
        tertiaryBorderColor: "#fcd34d",
        labelBackground: "#f9fafb",
        fontFamily:
          'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        fontSize: "14px",
      },
    };
  }
}

/**
 * Auto-fix common Mermaid syntax issues
 */
function autoFixMermaidSyntax(chart: string): string {
  let fixed = chart;

  // Fix parentheses in node labels - escape them or replace with brackets
  // Match patterns like "G --> J[text (something)]"
  fixed = fixed.replace(/(\[.*?)\((.*?)\)(.*?\])/g, "$1[$2]$3");

  // Fix standalone parentheses in node definitions
  fixed = fixed.replace(/\[([^\]]*)\(([^\)]*)\)([^\]]*)\]/g, "[$1 - $2$3]");

  return fixed;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderChart = async () => {
      if (!containerRef.current) return;

      // Try to render with auto-fixed syntax
      const chartToRender = autoFixMermaidSyntax(chart);

      try {
        // Initialize mermaid with current theme
        const themeConfig = getMermaidTheme();
        mermaid.initialize({
          startOnLoad: false,
          ...themeConfig,
          flowchart: {
            curve: "basis",
            padding: 20,
          },
        });

        // Clear previous content
        containerRef.current.innerHTML = "";

        // Generate unique ID
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Create a div for the mermaid chart
        const chartDiv = document.createElement("div");
        chartDiv.id = id;
        containerRef.current.appendChild(chartDiv);

        // Render the chart
        const { svg } = await mermaid.render(id, chartToRender);
        chartDiv.innerHTML = svg;

        setError(null);
      } catch (err: any) {
        console.error("Mermaid rendering error:", err);

        // Extract more helpful error message
        let errorMessage = "Failed to render diagram";
        if (err?.message) {
          errorMessage = err.message;
          // Check for common issues
          if (
            err.message.includes("Expecting") &&
            err.message.includes("got")
          ) {
            errorMessage = `Syntax error: ${err.message.split("Expecting")[0].trim()}`;
            if (chart.includes("(") && chart.includes(")")) {
              errorMessage +=
                "\n\nHint: Parentheses in node text need to be escaped or removed. Try using square brackets instead: [Melt] instead of (Melt)";
            }
          }
        }

        setError(errorMessage);

        // Fallback to showing the raw text with better formatting
        if (containerRef.current) {
          const escapedChart = chartToRender
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          containerRef.current.innerHTML = `<pre class="text-xs font-mono p-4 whitespace-pre-wrap">${escapedChart}</pre>`;
        }
      }
    };

    renderChart();
  }, [chart]);

  return (
    <div
      className={cn(
        "my-4 overflow-x-auto",
        "bg-muted/30 dark:bg-muted/20",
        "border border-border rounded-lg",
        "p-4",
        className,
      )}
    >
      {error && (
        <div className="mb-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <div className="text-sm font-medium text-destructive mb-1">
            Failed to render diagram
          </div>
          <div className="text-xs text-destructive/80 whitespace-pre-wrap font-mono">
            {error}
          </div>
        </div>
      )}
      <div ref={containerRef} className="mermaid-container" />
    </div>
  );
}

/**
 * Detects if content is a Mermaid diagram
 */
export function detectMermaidDiagram(
  content: string,
  language?: string,
): boolean {
  // If explicitly marked as mermaid
  if (language && language.toLowerCase() === "mermaid") {
    return true;
  }

  // Check for common Mermaid diagram keywords
  const mermaidKeywords = [
    /^\s*graph\s+(TB|BT|RL|LR|TD)/m,
    /^\s*flowchart\s+(TB|BT|RL|LR|TD)/m,
    /^\s*sequenceDiagram/m,
    /^\s*classDiagram/m,
    /^\s*stateDiagram/m,
    /^\s*erDiagram/m,
    /^\s*journey/m,
    /^\s*gantt/m,
    /^\s*pie\s+title/m,
    /^\s*gitGraph/m,
  ];

  return mermaidKeywords.some((pattern) => pattern.test(content));
}
