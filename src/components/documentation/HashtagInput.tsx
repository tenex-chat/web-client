'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

interface HashtagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
  placeholder?: string
  suggestions?: string[]
  className?: string
}

export function HashtagInput({
  value = [],
  onChange,
  maxTags = 5,
  placeholder = 'Add hashtags...',
  suggestions = [],
  className
}: HashtagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredSuggestions = suggestions.filter(
    tag => 
      tag.toLowerCase().includes(inputValue.toLowerCase()) &&
      !value.includes(tag)
  )

  const addTag = (tag: string) => {
    const cleanTag = tag.replace(/^#/, '').trim()
    if (
      cleanTag && 
      !value.includes(cleanTag) && 
      value.length < maxTags
    ) {
      onChange([...value, cleanTag])
      setInputValue('')
      setShowSuggestions(false)
      inputRef.current?.focus()
    }
  }

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1])
    }
  }

  const handleInputChange = (val: string) => {
    setInputValue(val)
    setShowSuggestions(val.length > 0 && filteredSuggestions.length > 0)
  }

  return (
    <div className={cn("", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {value.map(tag => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm"
          >
            <Hash className="h-3 w-3 text-zinc-500" />
            <span className="text-zinc-700 dark:text-zinc-300">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        
        {value.length < maxTags && (
          <div className="relative inline-block">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(inputValue.length > 0 && filteredSuggestions.length > 0)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={value.length === 0 ? placeholder : "Add tag..."}
              className="border-0 outline-none bg-transparent placeholder:text-zinc-400 text-sm w-32"
            />
            
            {showSuggestions && (
              <div className="absolute top-full mt-1 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 max-h-48 overflow-auto min-w-[150px]">
                {filteredSuggestions.map(suggestion => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addTag(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-sm"
                  >
                    <Hash className="h-3 w-3 text-zinc-500" />
                    <span className="text-zinc-700 dark:text-zinc-300">{suggestion}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}