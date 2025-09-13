"use client";

import React, { useState, useRef, KeyboardEvent } from "react";
import { X, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolSelectorProps {
  value: string[];
  onChange: (tools: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
  icon?: React.ReactNode;
  label?: string;
}

export function ToolSelector({
  value = [],
  onChange,
  placeholder = "Add tools...",
  suggestions = [],
  className,
  icon = <Wrench className="h-3 w-3" />,
  label = "tool",
}: ToolSelectorProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions - show all when input is empty (on focus), filter when typing
  const filteredSuggestions = suggestions.filter((tool) => {
    // Don't show tools already selected
    if (value.includes(tool)) return false;

    // If no input, show all available tools
    if (!inputValue) return true;

    // Otherwise filter by input
    return tool.toLowerCase().includes(inputValue.toLowerCase());
  });

  const addTool = (tool: string) => {
    const cleanTool = tool.trim();
    if (cleanTool && !value.includes(cleanTool)) {
      onChange([...value, cleanTool]);
      setInputValue("");
      setShowSuggestions(false);
      inputRef.current?.focus();
    }
  };

  const removeTool = (toolToRemove: string) => {
    onChange(value.filter((tool) => tool !== toolToRemove));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTool(inputValue);
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      removeTool(value[value.length - 1]);
    }
  };

  const handleInputChange = (val: string) => {
    setInputValue(val);
    // Always show suggestions if we have any (empty input shows all, typed input shows filtered)
    setShowSuggestions(filteredSuggestions.length > 0);
  };

  return (
    <div className={cn("", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((tool) => (
          <span
            key={tool}
            className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-sm"
          >
            {icon}
            <span className="text-zinc-700 dark:text-zinc-300">{tool}</span>
            <button
              type="button"
              onClick={() => removeTool(tool)}
              className="ml-1 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <div className="relative inline-block">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(filteredSuggestions.length > 0)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length === 0 ? placeholder : `Add ${label}...`}
            className="border-0 outline-none bg-transparent placeholder:text-zinc-400 text-sm min-w-[150px]"
          />

          {showSuggestions && (
            <div className="absolute top-full mt-1 left-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50 max-h-48 overflow-auto min-w-[250px]">
              {!inputValue && filteredSuggestions.length > 0 && (
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-zinc-200 dark:border-zinc-800">
                  Available tools ({filteredSuggestions.length})
                </div>
              )}
              {filteredSuggestions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  {inputValue
                    ? "No matching tools found"
                    : "No tools available"}
                </div>
              ) : (
                filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => addTool(suggestion)}
                    className="w-full text-left px-3 py-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-2 text-sm"
                  >
                    {icon}
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {suggestion}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
