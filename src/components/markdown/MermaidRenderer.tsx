import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidRendererProps {
  children: string;
}

export function MermaidRenderer({ children }: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current) return;

      try {
        // Initialize mermaid with theme based on dark mode
        const isDarkMode = document.documentElement.classList.contains("dark");

        mermaid.initialize({
          startOnLoad: false,
          theme: isDarkMode ? "dark" : "default",
          themeVariables: isDarkMode
            ? {
                primaryColor: "#1e293b",
                primaryTextColor: "#e2e8f0",
                primaryBorderColor: "#334155",
                lineColor: "#475569",
                secondaryColor: "#1e40af",
                tertiaryColor: "#312e81",
                background: "#0f172a",
                mainBkg: "#1e293b",
                secondBkg: "#334155",
                tertiaryBkg: "#475569",
                textColor: "#e2e8f0",
                fontSize: "14px",
              }
            : undefined,
          flowchart: {
            curve: "basis",
            padding: 20,
          },
        });

        // Generate unique ID for this diagram
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg } = await mermaid.render(id, children);

        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setIsRendered(true);
          setError(null);
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err);
        // Extract meaningful error message
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        setIsRendered(false);
      }
    };

    renderDiagram();
  }, [children]);

  if (error) {
    return (
      <div className="p-4 border border-red-300 dark:border-red-700 rounded-md bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
          Failed to render diagram
        </p>
        {error !== "Failed to render diagram" && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
        )}
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-red-600 dark:text-red-400 hover:underline">
            Show diagram source
          </summary>
          <pre className="mt-2 text-xs overflow-x-auto bg-black/5 dark:bg-white/5 p-2 rounded">
            <code>{children}</code>
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="my-4 overflow-x-auto">
      <div
        ref={containerRef}
        className={`mermaid-container inline-block min-w-full ${!isRendered ? "min-h-[200px] animate-pulse bg-gray-100 dark:bg-gray-800 rounded" : ""}`}
        style={{ maxWidth: "none" }}
      />
    </div>
  );
}
