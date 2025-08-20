'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'
import { Bold, Italic, Link as LinkIcon } from 'lucide-react'

interface DocumentationEditorProps {
  content?: string
  placeholder?: string
  onChange?: (content: string) => void
  className?: string
}

export function DocumentationEditor({ 
  content = '', 
  placeholder = 'Tell your story...', 
  onChange,
  className 
}: DocumentationEditorProps) {
  const [showToolbar, setShowToolbar] = useState(false)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 })

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-zinc-100 dark:bg-zinc-900 rounded-md p-4 font-mono text-sm my-4'
          }
        },
        code: {
          HTMLAttributes: {
            class: 'bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded font-mono text-sm'
          }
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-zinc-300 dark:border-zinc-700 pl-4 italic my-4'
          }
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-inside space-y-2 my-4'
          }
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-inside space-y-2 my-4'
          }
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mb-4 leading-relaxed'
          }
        },
        horizontalRule: {
          HTMLAttributes: {
            class: 'my-8 border-zinc-200 dark:border-zinc-800'
          }
        }
      }),
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 dark:text-blue-400 underline underline-offset-4 hover:text-blue-800 dark:hover:text-blue-300'
        }
      }),
      Placeholder.configure({
        placeholder,
        emptyNodeClass: 'first:before:text-muted-foreground/40 first:before:float-left first:before:content-[attr(data-placeholder)] first:before:pointer-events-none first:before:h-0'
      })
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      
      if (hasSelection && typeof window !== 'undefined') {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          const rect = range.getBoundingClientRect()
          setToolbarPosition({
            top: rect.top - 50,
            left: rect.left + rect.width / 2
          })
          setShowToolbar(true)
        }
      } else {
        setShowToolbar(false)
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-zinc dark:prose-invert max-w-none',
          'focus:outline-none',
          'min-h-full',
          '[&>*:first-child]:mt-0',
          '[&>h1]:text-3xl [&>h1]:font-bold [&>h1]:tracking-tight [&>h1]:mb-4 [&>h1]:mt-8',
          '[&>h2]:text-2xl [&>h2]:font-semibold [&>h2]:tracking-tight [&>h2]:mb-3 [&>h2]:mt-6',
          '[&>h3]:text-xl [&>h3]:font-semibold [&>h3]:mb-2 [&>h3]:mt-4',
          '[&>p]:text-[21px] [&>p]:leading-[1.58] [&>p]:tracking-[-0.003em] [&>p]:mb-6',
          '[&>ul]:my-6 [&>ol]:my-6',
          '[&>li]:text-[21px] [&>li]:leading-[1.58]',
          '[&>blockquote]:text-[21px] [&>blockquote]:italic [&>blockquote]:text-muted-foreground',
          'font-serif',
          className
        )
      }
    }
  })

  // Keyboard shortcuts
  useEffect(() => {
    if (!editor) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!e.metaKey && !e.ctrlKey) return

      switch(e.key) {
        case 'b':
          e.preventDefault()
          editor.chain().focus().toggleBold().run()
          break
        case 'i':
          e.preventDefault()
          editor.chain().focus().toggleItalic().run()
          break
        case 'k':
          e.preventDefault()
          const url = window.prompt('Enter URL:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* Floating toolbar - appears on text selection */}
      {showToolbar && (
        <div 
          className="fixed z-50 flex items-center bg-zinc-900 dark:bg-zinc-800 text-white rounded shadow-xl transform -translate-x-1/2 transition-all duration-200"
          style={{ 
            top: `${toolbarPosition.top}px`, 
            left: `${toolbarPosition.left}px`,
            opacity: showToolbar ? 1 : 0,
            pointerEvents: showToolbar ? 'auto' : 'none'
          }}
        >
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "px-3 py-2 hover:bg-white/10 transition-colors",
              editor.isActive('bold') && 'bg-white/20'
            )}
            title="Bold (⌘B)"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "px-3 py-2 hover:bg-white/10 transition-colors",
              editor.isActive('italic') && 'bg-white/20'
            )}
            title="Italic (⌘I)"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-5 bg-white/20" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              "px-3 py-2 hover:bg-white/10 transition-colors",
              editor.isActive('heading', { level: 1 }) && 'bg-white/20'
            )}
            title="Large heading"
          >
            <span className="text-xs font-bold">H1</span>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "px-3 py-2 hover:bg-white/10 transition-colors",
              editor.isActive('heading', { level: 2 }) && 'bg-white/20'
            )}
            title="Small heading"
          >
            <span className="text-xs font-bold">H2</span>
          </button>
          <div className="w-px h-5 bg-white/20" />
          <button
            type="button"
            onClick={() => {
              const url = window.prompt('Enter URL:')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            className={cn(
              "px-3 py-2 hover:bg-white/10 transition-colors",
              editor.isActive('link') && 'bg-white/20'
            )}
            title="Link (⌘K)"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <EditorContent editor={editor} className="flex-1" />
    </div>
  )
}