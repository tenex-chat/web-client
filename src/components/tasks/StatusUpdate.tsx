import type { NDKEvent } from "@nostr-dev-kit/ndk";
import { useNDKCurrentPubkey, useProfileValue } from "@nostr-dev-kit/ndk-hooks";
import { Brain, Cpu, DollarSign, GitCommit } from "lucide-react";
import { type ReactNode, memo, useMemo, useState } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import { useTimeFormat } from "../../hooks/useTimeFormat";
import { findNostrEntities } from "../../utils/nostrEntityParser";
import { NostrEntityCard } from "../common/NostrEntityCard";
import { LLMMetadataDialog } from "../dialogs/LLMMetadataDialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "../ui/hover-card";

interface StatusUpdateProps {
    event: NDKEvent;
}

export const StatusUpdate = memo(function StatusUpdate({ event }: StatusUpdateProps) {
    const profile = useProfileValue(event.pubkey);
    const currentPubkey = useNDKCurrentPubkey();
    const { formatRelativeTime } = useTimeFormat();
    const [showMetadataDialog, setShowMetadataDialog] = useState(false);

    // Process content for Nostr entities
    const processedContent = useMemo(() => {
        const entities = findNostrEntities(event.content);
        if (entities.length === 0) {
            return { content: event.content, hasEntities: false };
        }

        // Replace nostr: links with markdown links that will be rendered as entity cards
        let processedText = event.content;
        for (const entity of entities) {
            const nostrLink = `nostr:${entity.bech32}`;
            // Replace with a placeholder that won't be processed by markdown
            processedText = processedText.replace(
                nostrLink,
                `[NOSTR_ENTITY:${entity.bech32}:${entity.type}]`
            );
        }

        return { content: processedText, hasEntities: true, entities };
    }, [event.content]);

    // Custom components for ReactMarkdown
    const markdownComponents: Components = {
        code({ className, children }) {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match;
            return !isInline && match ? (
                <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    className="rounded-md text-xs font-mono"
                    customStyle={{ fontSize: "0.75rem" }}
                >
                    {String(children).replace(/\n$/, "")}
                </SyntaxHighlighter>
            ) : (
                <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
            );
        },
        pre({ children }) {
            return <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto font-mono text-sm mb-4 whitespace-pre">{children}</pre>;
        },
        ul({ children }) {
            return <ul className="list-disc list-inside my-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
            return <ol className="list-decimal list-inside my-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
            return <li className="ml-2">{children}</li>;
        },
        p({ children, ...props }) {
            // Process text nodes to replace entity placeholders
            const processChildren = (children: ReactNode): ReactNode => {
                if (typeof children === "string") {
                    // Check for entity placeholders
                    const entityRegex = /\[NOSTR_ENTITY:([^:]+):([^\]]+)\]/g;
                    const parts = [];
                    let lastIndex = 0;
                    let match: RegExpExecArray | null;

                    match = entityRegex.exec(children);
                    while (match !== null) {
                        // Add text before the entity
                        if (match.index > lastIndex) {
                            parts.push(children.slice(lastIndex, match.index));
                        }

                        // Find the entity
                        const bech32 = match[1];
                        const entity = processedContent.entities?.find((e) => e.bech32 === bech32);
                        if (entity) {
                            parts.push(
                                <NostrEntityCard
                                    key={`entity-${bech32}`}
                                    entity={entity}
                                    className="inline-block mx-1 my-0.5"
                                />
                            );
                        }

                        lastIndex = match.index + match[0].length;
                        match = entityRegex.exec(children);
                    }

                    // Add remaining text
                    if (lastIndex < children.length) {
                        parts.push(children.slice(lastIndex));
                    }

                    return parts.length > 0 ? parts : children;
                }
                if (Array.isArray(children)) {
                    return children.map((child, idx) => {
                        const processed = processChildren(child);
                        return typeof processed === "string" || !processed ? (
                            processed
                        ) : (
                            <span
                                key={`child-${idx}-${typeof child === "string" ? child.slice(0, 10) : ""}`}
                            >
                                {processed}
                            </span>
                        );
                    });
                }
                if (
                    children &&
                    typeof children === "object" &&
                    "props" in children &&
                    children.props &&
                    typeof children.props === "object" &&
                    "children" in children.props
                ) {
                    return {
                        ...children,
                        props: {
                            ...children.props,
                            children: processChildren(children.props.children as React.ReactNode),
                        },
                    };
                }
                return children;
            };

            const processedChildren = processChildren(children);
            return <p {...props}>{processedChildren}</p>;
        },
    };

    const getDisplayName = () => {
        if (event.pubkey === currentPubkey) return "You";
        return profile?.displayName || profile?.name || `user_${event.pubkey.slice(0, 8)}`;
    };

    const getConfidenceLevel = () => {
        return event.tagValue("confidence");
    };

    const getCommitHash = () => {
        return event.tagValue("commit");
    };

    const getAgentName = () => {
        return profile?.name || event.tagValue("agent") || "Agent";
    };

    const isUserMessage = () => {
        return event.tagValue("t") === "task-comment" || event.pubkey === currentPubkey;
    };

    const isAgentUpdate = () => {
        return !!event.tagValue("agent") || !!event.tagValue("confidence");
    };

    const getLLMMetadata = () => {
        const metadata: Record<string, string> = {};

        // Extract all LLM-related tags
        const llmTags = [
            "llm-model",
            "llm-provider",
            "llm-prompt-tokens",
            "llm-completion-tokens",
            "llm-total-tokens",
            "llm-cache-creation-tokens",
            "llm-cache-read-tokens",
            "llm-confidence",
            "llm-cost",
            "llm-cost-usd",
            "llm-system-prompt",
            "llm-user-prompt",
            "llm-raw-response",
        ];

        for (const tag of llmTags) {
            const value = event.tagValue(tag);
            if (value) {
                metadata[tag] = value;
            }
        }

        // Also check for system-prompt and user-prompt tags (without llm- prefix)
        // These are used in typing indicators and response events
        const systemPromptValue = event.tagValue("system-prompt");
        if (systemPromptValue && !metadata["llm-system-prompt"]) {
            metadata["llm-system-prompt"] = systemPromptValue;
        }

        const userPromptValue = event.tagValue("prompt");
        if (userPromptValue && !metadata["llm-user-prompt"]) {
            metadata["llm-user-prompt"] = userPromptValue;
        }

        // Check for alternative token naming conventions
        // CLI uses llm-input-tokens/llm-output-tokens instead of llm-prompt-tokens/llm-completion-tokens
        const inputTokensValue = event.tagValue("llm-input-tokens");
        if (inputTokensValue && !metadata["llm-prompt-tokens"]) {
            metadata["llm-prompt-tokens"] = inputTokensValue;
        }

        const outputTokensValue = event.tagValue("llm-output-tokens");
        if (outputTokensValue && !metadata["llm-completion-tokens"]) {
            metadata["llm-completion-tokens"] = outputTokensValue;
        }

        return Object.keys(metadata).length > 0 ? metadata : null;
    };

    // Get p-tagged users
    const pTaggedPubkeys = useMemo(() => {
        const pubkeys: string[] = [];
        for (const tag of event.tags) {
            if (tag[0] === "p" && tag[1]) {
                pubkeys.push(tag[1]);
            }
        }
        return pubkeys;
    }, [event.tags]);

    // Component for rendering p-tagged avatars
    const PTaggedAvatars = () => {
        if (pTaggedPubkeys.length === 0) return null;

        return (
            <div className="flex -space-x-1">
                {pTaggedPubkeys.map((pubkey) => (
                    <PTaggedAvatar key={pubkey} pubkey={pubkey} />
                ))}
            </div>
        );
    };

    // Individual avatar component with hover
    const PTaggedAvatar = ({ pubkey }: { pubkey: string }) => {
        const profile = useProfileValue(pubkey);

        return (
            <HoverCard>
                <HoverCardTrigger asChild>
                    <Avatar className="w-4 h-4 border border-background">
                        <AvatarImage src={profile?.image} alt={profile?.name || "User"} />
                        <AvatarFallback className="text-[8px]">
                            {profile?.name?.charAt(0).toUpperCase() ||
                                pubkey.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </HoverCardTrigger>
                <HoverCardContent className="w-48" side="top">
                    <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                            <AvatarImage src={profile?.image} alt={profile?.name || "User"} />
                            <AvatarFallback className="text-[10px]">
                                {profile?.name?.charAt(0).toUpperCase() ||
                                    pubkey.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-semibold">
                                {profile?.name || `user_${pubkey.slice(0, 8)}`}
                            </p>
                        </div>
                    </div>
                </HoverCardContent>
            </HoverCard>
        );
    };

    if (isUserMessage()) {
        // User message - align right, different styling
        return (
            <div className="flex justify-end p-3">
                <div className="max-w-[80%]">
                    <div className="bg-primary text-primary-foreground rounded-lg px-3 py-2">
                        <div className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none prose-p:my-1 prose-headings:text-primary-foreground prose-a:text-primary-foreground prose-a:underline prose-strong:text-primary-foreground prose-blockquote:text-primary-foreground/80 prose-blockquote:border-l-primary-foreground">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={markdownComponents}
                            >
                                {processedContent.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 justify-end text-xs text-muted-foreground mt-1">
                        <span>{formatRelativeTime(event.created_at!)}</span>
                        <PTaggedAvatars />
                    </div>
                </div>
            </div>
        );
    }

    // Agent update - align left, original styling
    return (
        <>
            <div className="flex gap-3 p-3 hover:bg-accent/50 rounded-lg transition-colors">
                {/* Avatar */}
                <div className="flex-shrink-0">
                    <Avatar className="w-8 h-8">
                        <AvatarImage src={profile?.image} alt={profile?.name || "Agent"} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-primary-foreground text-xs">
                            {isAgentUpdate() ? (
                                <Brain className="w-4 h-4" />
                            ) : (
                                profile?.name?.charAt(0).toUpperCase() ||
                                event.pubkey.slice(0, 2).toUpperCase()
                            )}
                        </AvatarFallback>
                    </Avatar>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-foreground">
                            {isAgentUpdate() ? getAgentName() : getDisplayName()}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(event.created_at!)}
                        </span>
                        {/* P-tagged avatars */}
                        <PTaggedAvatars />
                        {/* LLM Metadata Icon - shown when metadata exists */}
                        {getLLMMetadata() && (
                            <button
                                type="button"
                                onClick={() => setShowMetadataDialog(true)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="View LLM metadata"
                            >
                                <Cpu className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {getConfidenceLevel() && (
                            <Badge variant="secondary" className="text-xs h-5 px-2">
                                {getConfidenceLevel()}/10
                            </Badge>
                        )}
                        {(getLLMMetadata()?.["llm-cost-usd"] || getLLMMetadata()?.["llm-cost"]) && (
                            <Badge
                                variant="outline"
                                className="text-xs h-5 px-2 text-green-600 border-green-600"
                            >
                                <DollarSign className="w-3 h-3 mr-0.5" />
                                {getLLMMetadata()?.["llm-cost-usd"] ||
                                    getLLMMetadata()?.["llm-cost"]}
                            </Badge>
                        )}
                    </div>

                    {/* Message content */}
                    <div className="text-sm text-foreground/90 leading-relaxed mb-2 prose prose-sm max-w-none prose-p:my-1 prose-headings:text-foreground prose-a:text-primary prose-strong:text-foreground prose-blockquote:text-muted-foreground prose-blockquote:border-l-primary">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {processedContent.content}
                        </ReactMarkdown>
                    </div>

                    {/* Footer with commit info and LLM metadata */}
                    <div className="flex flex-col gap-2">
                        {getCommitHash() && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <GitCommit className="w-3 h-3" />
                                <span className="font-mono bg-muted px-1.5 py-0.5 rounded">
                                    {getCommitHash()?.slice(0, 7)}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* LLM Metadata Dialog */}
            {getLLMMetadata() && (
                <LLMMetadataDialog
                    open={showMetadataDialog}
                    onOpenChange={setShowMetadataDialog}
                    metadata={getLLMMetadata()!}
                />
            )}
        </>
    );
});
