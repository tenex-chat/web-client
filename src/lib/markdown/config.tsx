import React, { ReactNode, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { SafeNostrEntityCard } from "@/components/common/SafeNostrEntityCard";
import { MermaidRenderer } from "@/components/markdown/MermaidRenderer";
import type { Components } from "react-markdown";
import type { NDKEvent, NDKArticle, NDKKind } from "@nostr-dev-kit/ndk-hooks";
import { useEvent } from "@nostr-dev-kit/ndk-hooks";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { DocumentationViewer } from "@/components/documentation/DocumentationViewer";

interface MarkdownComponentsOptions {
  isDarkMode: boolean;
  isMobile?: boolean;
  onImageClick?: (src: string) => void;
  projectId?: string | null;
  onConversationClick?: (event: NDKEvent) => void;
}

/**
 * Component that renders a nostr link with custom text
 * Handles opening the appropriate viewer based on the event kind
 */
function NostrLinkWithText({
  bech32,
  text,
  onConversationClick,
}: {
  bech32: string;
  text: ReactNode;
  onConversationClick?: (event: NDKEvent) => void;
}) {
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Fetch the event to determine its kind
  const isEventEntity =
    bech32.startsWith("nevent1") ||
    bech32.startsWith("note1") ||
    bech32.startsWith("naddr1");
  const event = useEvent(isEventEntity ? bech32 : false, {});

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (!event) {
      // If we don't have the event yet, open in njump as fallback
      window.open(`https://njump.me/${bech32}`, "_blank");
      return;
    }

    // Handle different event kinds
    switch (event.kind) {
      case NDKKind.Thread: // kind:11
        if (onConversationClick) {
          onConversationClick(event);
        }
        break;
        
      case NDKArticle.kind: // kind:30023
        setSheetOpen(true);
        break;
        
      case 31933: // Project event
        // For project events, we could open a project viewer
        // For now, open in a new tab with njump
        window.open(`https://njump.me/${bech32}`, "_blank");
        break;
        
      case NDKKind.GenericReply: // kind:1111 - agent messages
        // For agent messages, navigate to the conversation if we have a callback
        // Otherwise open in njump
        if (onConversationClick) {
          onConversationClick(event);
        } else {
          window.open(`https://njump.me/${bech32}`, "_blank");
        }
        break;
        
      default:
        // For other kinds, open in njump
        window.open(`https://njump.me/${bech32}`, "_blank");
    }
  };

  return (
    <>
      <a
        href="#"
        onClick={handleClick}
        className="text-blue-500 hover:text-blue-600 underline cursor-pointer"
      >
        {text}
      </a>
      
      {/* Sheet for document viewer */}
      {event && event.kind === NDKArticle.kind && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent
            className="p-0 flex flex-col w-[65%] sm:max-w-[65%]"
            side="right"
          >
            <DocumentationViewer
              article={NDKArticle.from(event)}
              onBack={() => setSheetOpen(false)}
            />
          </SheetContent>
        </Sheet>
      )}
    </>
  );
}

/**
 * Get standardized markdown components configuration
 * Used across the app for consistent markdown rendering
 */
export function getMarkdownComponents({
  isDarkMode,
  isMobile = false,
  onImageClick,
  onConversationClick,
}: MarkdownComponentsOptions) {
  // Helper function to process text and replace nostr entities
  const processNostrEntities = (child: ReactNode): ReactNode | ReactNode[] => {
    if (typeof child === "string") {
      // Look for nostr: references in the text
      const nostrRegex =
        /(?:nostr:)?(npub1|nprofile1|nevent1|naddr1|note1)[a-zA-Z0-9]+/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = nostrRegex.exec(child)) !== null) {
        // Add text before the nostr entity
        if (match.index > lastIndex) {
          parts.push(child.substring(lastIndex, match.index));
        }

        // Parse the nostr entity
        const fullMatch = match[0];
        const bech32 = fullMatch.startsWith("nostr:")
          ? fullMatch.substring(6)
          : fullMatch;

        // Just pass the bech32 directly to NostrEntityCard
        parts.push(
          <SafeNostrEntityCard
            key={`${match.index}-${bech32}`}
            bech32={bech32}
            onConversationClick={onConversationClick}
          />,
        );

        lastIndex = match.index + match[0].length;
      }

      // Add remaining text
      if (lastIndex < child.length) {
        parts.push(child.substring(lastIndex));
      }

      return parts.length > 0 ? parts : child;
    } else if (Array.isArray(child)) {
      return child.map(processNostrEntities);
    }
    return child;
  };

  const components: Components = {
    p: ({ children }) => {
      const processedChildren = Array.isArray(children)
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children);

      return (
        <p className={cn("last:mb-0", isMobile ? "mb-3" : "mb-2")}>
          {processedChildren}
        </p>
      );
    },

    a: ({ href, children }) => {
      // Check if this is a placeholder link created by our processing
      const childText = typeof children === "string" ? children : "";

      // If this link contains a nostr entity placeholder, don't render it as a link
      if (childText.includes("__NOSTR_ENTITY_")) {
        return <>{children}</>;
      }

      // If href contains a nostr entity placeholder, don't render it as a link
      if (
        href &&
        typeof href === "string" &&
        href.includes("__NOSTR_ENTITY_")
      ) {
        return <>{children}</>;
      }

      // Check if the children contains a nostr link (when href is empty or missing)
      // Now also handles bare bech32 strings like npub1...
      if (
        childText &&
        childText.match(/^(npub1|nprofile1|nevent1|naddr1|note1)[a-zA-Z0-9]+$/)
      ) {
        // Don't use compact mode for standalone entity references
        return (
          <SafeNostrEntityCard
            bech32={childText}
            compact={false}
            onConversationClick={onConversationClick}
          />
        );
      }

      // Check if this is a Nostr entity link in href
      // Now also handles bare bech32 strings like npub1...
      if (
        href &&
        typeof href === "string" &&
        href.match(/^(npub1|nprofile1|nevent1|naddr1|note1)[a-zA-Z0-9]+$/)
      ) {
        // Don't use compact mode for standalone entity references
        return (
          <SafeNostrEntityCard
            bech32={href}
            compact={false}
            onConversationClick={onConversationClick}
          />
        );
      }

      // Check if this is a nostr: protocol link (e.g., nostr:naddr1...)
      if (
        href &&
        typeof href === "string" &&
        href.startsWith("nostr:")
      ) {
        // Extract the bech32 part after "nostr:"
        const bech32 = href.substring(6);
        
        // Validate it's a proper bech32 string
        if (bech32.match(/^(npub1|nprofile1|nevent1|naddr1|note1)[a-zA-Z0-9]+$/)) {
          // For markdown links with custom text, we need to create a special
          // clickable link that preserves the custom text but handles the nostr entity
          // We'll wrap the SafeNostrEntityCard in a custom component that shows the text
          return (
            <NostrLinkWithText
              bech32={bech32}
              text={children}
              onConversationClick={onConversationClick}
            />
          );
        }
      }

      // Regular link
      return (
        <a
          href={href || childText}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline"
        >
          {children}
        </a>
      );
    },

    strong: ({ children }) => {
      const processedChildren = Array.isArray(children)
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children);
      return <strong className="font-bold">{processedChildren}</strong>;
    },

    em: ({ children }) => {
      const processedChildren = Array.isArray(children)
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children);
      return <em className="italic">{processedChildren}</em>;
    },

    img: ({ src, alt }) => (
      <div className="my-3">
        <img
          src={src}
          alt={alt || "Image"}
          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: "400px", objectFit: "contain" }}
          onClick={() => onImageClick?.(src || "")}
          loading="lazy"
        />
      </div>
    ),

    code: ({
      className,
      children,
      ...props
    }: React.HTMLAttributes<HTMLElement>) => {
      const match = /language-(\w+)/.exec(className || "");
      const isInline = !className || !match;

      if (isInline) {
        return (
          <code
            className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-xs"
            {...props}
          >
            {children}
          </code>
        );
      }

      const language = match ? match[1] : "text";

      // Handle mermaid diagrams
      if (language === "mermaid") {
        return (
          <MermaidRenderer>
            {String(children).replace(/\n$/, "")}
          </MermaidRenderer>
        );
      }

      return (
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? oneDark : oneLight}
          customStyle={{
            margin: "8px 0",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "0.75rem",
            lineHeight: "1.5",
          }}
          PreTag="div"
          {...(props as any)}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    },

    ul: ({ children }) => (
      <ul
        className={cn("list-disc pl-6 space-y-1", isMobile ? "mb-3" : "mb-2")}
      >
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol
        className={cn(
          "list-decimal pl-6 space-y-1",
          isMobile ? "mb-3" : "mb-2",
        )}
      >
        {children}
      </ol>
    ),

    li: ({ children }) => {
      const processedChildren = Array.isArray(children)
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children);
      return (
        <li className={cn(isMobile ? "ml-1 mb-1" : "ml-1")}>
          {processedChildren}
        </li>
      );
    },

    h1: ({ children }) => (
      <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-bold mb-1 mt-2">{children}</h4>
    ),

    blockquote: ({ children }) => {
      const processedChildren = Array.isArray(children)
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children);
      return (
        <blockquote className="border-l-4 border-gray-400 dark:border-gray-600 pl-3 my-2 italic opacity-90">
          {processedChildren}
        </blockquote>
      );
    },

    hr: () => <hr className="my-3 border-gray-300 dark:border-gray-600" />,
  };

  return components;
}

/**
 * Hook to get markdown components with current theme
 */
export function useMarkdownComponents(
  options?: Omit<MarkdownComponentsOptions, "isDarkMode">,
) {
  const isDarkMode = React.useMemo(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  }, []);

  return React.useMemo(
    () => getMarkdownComponents({ ...options, isDarkMode }),
    [
      isDarkMode,
      options?.isMobile,
      options?.onImageClick,
      options?.onConversationClick,
    ],
  );
}
