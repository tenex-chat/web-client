import React from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'
import { findNostrEntities } from '@/lib/utils/nostrEntityParser'
import { NostrEntityCard } from '@/components/common/NostrEntityCard'

interface MarkdownComponentsOptions {
  isDarkMode: boolean
  isMobile?: boolean
  onImageClick?: (src: string) => void
}

/**
 * Get standardized markdown components configuration
 * Used across the app for consistent markdown rendering
 */
export function getMarkdownComponents({
  isDarkMode,
  isMobile = false,
  onImageClick
}: MarkdownComponentsOptions) {
  // Helper function to process text and replace nostr entity placeholders
  const processNostrEntities = (child: any): any => {
    if (typeof child === 'string') {
      // Check for nostr entity placeholders
      const placeholderRegex = /__NOSTR_ENTITY_(nostr:[a-zA-Z0-9]+)__/g
      const parts = []
      let lastIndex = 0
      let match
      
      while ((match = placeholderRegex.exec(child)) !== null) {
        // Add text before placeholder
        if (match.index > lastIndex) {
          parts.push(child.substring(lastIndex, match.index))
        }
        
        // Extract the original nostr entity
        const nostrEntity = match[1]
        const entities = findNostrEntities(nostrEntity)
        if (entities.length > 0) {
          parts.push(<NostrEntityCard key={`${match.index}-${nostrEntity}`} entity={entities[0]} compact />)
        } else {
          parts.push(nostrEntity)
        }
        
        lastIndex = match.index + match[0].length
      }
      
      // Add remaining text
      if (lastIndex < child.length) {
        parts.push(child.substring(lastIndex))
      }
      
      return parts.length > 0 ? parts : child
    } else if (Array.isArray(child)) {
      return child.map(processNostrEntities)
    }
    return child
  }
  
  return {
    p: ({ children }: any) => {
      const processedChildren = Array.isArray(children) 
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children)
      
      return (
        <p className={cn(
          "last:mb-0",
          isMobile ? "mb-3" : "mb-2"
        )}>
          {processedChildren}
        </p>
      )
    },
    
    a: ({ href, children }: any) => {
      // Check if this is a placeholder link created by our processing
      const childText = typeof children === 'string' ? children : ''
      
      // If this link contains a nostr entity placeholder, don't render it as a link
      if (childText.includes('__NOSTR_ENTITY_')) {
        return <>{children}</>
      }
      
      // If href contains a nostr entity placeholder, don't render it as a link
      if (href && typeof href === 'string' && href.includes('__NOSTR_ENTITY_')) {
        return <>{children}</>
      }
      
      // Check if the children contains a nostr link (when href is empty or missing)
      if (childText && childText.startsWith('nostr:')) {
        const entities = findNostrEntities(childText)
        if (entities.length > 0) {
          return <NostrEntityCard entity={entities[0]} compact />
        }
      }
      
      // Check if this is a Nostr entity link in href
      if (href && typeof href === 'string' && href.startsWith('nostr:')) {
        const entities = findNostrEntities(href)
        if (entities.length > 0) {
          return <NostrEntityCard entity={entities[0]} compact />
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
      )
    },
    
    strong: ({ children }: any) => {
      const processedChildren = Array.isArray(children) 
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children)
      return <strong className="font-bold">{processedChildren}</strong>
    },
    
    em: ({ children }: any) => {
      const processedChildren = Array.isArray(children) 
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children)
      return <em className="italic">{processedChildren}</em>
    },
    
    img: ({ src, alt }: any) => (
      <div className="my-3">
        <img
          src={src}
          alt={alt || 'Image'}
          className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
          style={{ maxHeight: '400px', objectFit: 'contain' }}
          onClick={() => onImageClick?.(src || '')}
          loading="lazy"
        />
      </div>
    ),
    
    code: ({ className, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
      const match = /language-(\w+)/.exec(className || '')
      const isInline = !className || !match
      
      if (isInline) {
        return (
          <code className="px-1 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-xs" {...props}>
            {children}
          </code>
        )
      }
      
      const language = match ? match[1] : 'text'
      
      return (
        <SyntaxHighlighter
          language={language}
          style={isDarkMode ? oneDark : oneLight}
          customStyle={{
            margin: '8px 0',
            padding: '12px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            lineHeight: '1.5',
          }}
          PreTag="div"
          {...props as any}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      )
    },
    
    ul: ({ children }: any) => (
      <ul className={cn(
        "list-disc pl-6 space-y-1",
        isMobile ? "mb-3" : "mb-2"
      )}>
        {children}
      </ul>
    ),
    
    ol: ({ children }: any) => (
      <ol className={cn(
        "list-decimal pl-6 space-y-1",
        isMobile ? "mb-3" : "mb-2"
      )}>
        {children}
      </ol>
    ),
    
    li: ({ children }: any) => {
      const processedChildren = Array.isArray(children) 
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children)
      return (
        <li className={cn(
          isMobile ? "ml-1 mb-1" : "ml-1"
        )}>
          {processedChildren}
        </li>
      )
    },
    
    h1: ({ children }: any) => <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>,
    h3: ({ children }: any) => <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>,
    h4: ({ children }: any) => <h4 className="text-sm font-bold mb-1 mt-2">{children}</h4>,
    
    blockquote: ({ children }: any) => {
      const processedChildren = Array.isArray(children) 
        ? children.map(processNostrEntities).flat()
        : processNostrEntities(children)
      return (
        <blockquote className="border-l-4 border-gray-400 dark:border-gray-600 pl-3 my-2 italic opacity-90">
          {processedChildren}
        </blockquote>
      )
    },
    
    hr: () => <hr className="my-3 border-gray-300 dark:border-gray-600" />,
  }
}

/**
 * Hook to get markdown components with current theme
 */
export function useMarkdownComponents(options?: Omit<MarkdownComponentsOptions, 'isDarkMode'>) {
  const isDarkMode = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    return document.documentElement.classList.contains('dark')
  }, [])
  
  return React.useMemo(() => 
    getMarkdownComponents({ ...options, isDarkMode }), 
    [isDarkMode, options?.isMobile, options?.onImageClick]
  )
}