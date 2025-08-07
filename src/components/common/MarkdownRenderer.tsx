import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";

const defaultMarkdownComponents: Components = {
    h1: ({ children }) => (
        <h1 className="text-xl font-bold mb-3 text-foreground">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="text-lg font-semibold mb-2 text-foreground">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="text-base font-medium mb-1 text-foreground">{children}</h3>
    ),
    p: ({ children }) => (
        <p className="mb-2 text-sm leading-relaxed">{children}</p>
    ),
    ul: ({ children }) => (
        <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
    ),
    ol: ({ children }) => (
        <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
    ),
    li: ({ children }) => (
        <li className="text-sm">{children}</li>
    ),
    blockquote: ({ children }) => (
        <blockquote className="border-l-4 border-primary/30 pl-4 my-2 italic text-muted-foreground">
            {children}
        </blockquote>
    ),
    hr: () => <hr className="my-3 border-border" />,
    code: ({ className, children, ...props }) => {
        const match = /language-(\w+)/.exec(className || "");
        const isInline = !match;
        
        if (isInline) {
            return (
                <code className="px-1 py-0.5 rounded bg-muted text-foreground text-xs" {...props}>
                    {children}
                </code>
            );
        }
        
        return (
            <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{
                    fontSize: "0.75rem",
                    margin: "0.5rem 0",
                    borderRadius: "0.375rem",
                }}
            >
                {String(children).replace(/\n$/, "")}
            </SyntaxHighlighter>
        );
    },
    pre: ({ children }) => {
        return <div className="overflow-auto">{children}</div>;
    },
    a: ({ href, children }) => (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline"
        >
            {children}
        </a>
    ),
    table: ({ children }) => (
        <div className="overflow-x-auto my-2">
            <table className="min-w-full border-collapse">
                {children}
            </table>
        </div>
    ),
    th: ({ children }) => (
        <th className="border border-border px-3 py-2 text-left font-medium text-sm bg-muted">
            {children}
        </th>
    ),
    td: ({ children }) => (
        <td className="border border-border px-3 py-2 text-sm">
            {children}
        </td>
    ),
};

interface MarkdownRendererProps {
    content: string;
    className?: string;
    components?: Partial<Components>;
    skipHtml?: boolean;
}

export function MarkdownRenderer({ 
    content, 
    className = "prose prose-sm max-w-none",
    components = {},
    skipHtml = false
}: MarkdownRendererProps) {
    const mergedComponents = {
        ...defaultMarkdownComponents,
        ...components
    };

    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={mergedComponents}
        >
            {content}
        </ReactMarkdown>
    );
}