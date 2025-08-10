import { useState, useCallback, useMemo, RefObject } from 'react'

export interface AgentInstance {
  pubkey: string
  name: string
  picture?: string
  description?: string
}

export function useMentionAutocomplete(
  agents: AgentInstance[],
  input: string,
  setInput: (value: string) => void,
  textareaRef: RefObject<HTMLTextAreaElement>
) {
  const [showAgentMenu, setShowAgentMenu] = useState(false)
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0)
  const [mentionStartIndex, setMentionStartIndex] = useState(-1)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    if (!searchQuery) return agents
    
    const query = searchQuery.toLowerCase()
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(query)
    )
  }, [agents, searchQuery])

  // Detect @mentions in input
  const handleInputChange = useCallback((value: string) => {
    setInput(value)

    if (!textareaRef.current) return

    const cursorPosition = textareaRef.current.selectionStart
    const textBeforeCursor = value.slice(0, cursorPosition)
    
    // Find the last @ symbol before cursor
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      
      // Check if we're still in a mention (no spaces after @)
      if (!textAfterAt.includes(' ')) {
        setMentionStartIndex(lastAtIndex)
        setSearchQuery(textAfterAt)
        setShowAgentMenu(true)
        setSelectedAgentIndex(0)
      } else {
        setShowAgentMenu(false)
      }
    } else {
      setShowAgentMenu(false)
    }
  }, [setInput, textareaRef])

  // Handle keyboard navigation in mention menu
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAgentMenu) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedAgentIndex(prev =>
          prev < filteredAgents.length - 1 ? prev + 1 : prev
        )
        break
      
      case 'ArrowUp':
        e.preventDefault()
        setSelectedAgentIndex(prev => (prev > 0 ? prev - 1 : prev))
        break
      
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (filteredAgents[selectedAgentIndex]) {
          insertMention(filteredAgents[selectedAgentIndex])
        }
        break
      
      case 'Escape':
        e.preventDefault()
        setShowAgentMenu(false)
        break
    }
  }, [showAgentMenu, filteredAgents, selectedAgentIndex])

  // Insert selected mention
  const insertMention = useCallback((agent: AgentInstance) => {
    if (mentionStartIndex === -1) return

    const beforeMention = input.slice(0, mentionStartIndex)
    const afterMention = input.slice(mentionStartIndex + searchQuery.length + 1)
    
    const newValue = `${beforeMention}@${agent.name} ${afterMention}`
    setInput(newValue)
    
    // Reset state
    setShowAgentMenu(false)
    setMentionStartIndex(-1)
    setSearchQuery('')
    setSelectedAgentIndex(0)

    // Move cursor after the mention
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPosition = beforeMention.length + agent.name.length + 2
        textareaRef.current.selectionStart = newCursorPosition
        textareaRef.current.selectionEnd = newCursorPosition
        textareaRef.current.focus()
      }
    }, 0)
  }, [input, mentionStartIndex, searchQuery, setInput, textareaRef])

  // Extract mentioned agents from the input
  const extractMentions = useCallback((): AgentInstance[] => {
    // More flexible pattern that matches @name with various characters
    // Matches until we hit whitespace that's not part of the name
    const mentionPattern = /@([^\s@]+(?:\s+[^\s@]+)*)/g
    const matches = [...input.matchAll(mentionPattern)]
    
    const mentionedAgents: AgentInstance[] = []
    
    for (const match of matches) {
      const mentionName = match[1].trim()
      // Try exact match first, then try partial match
      const agent = agents.find(a =>
        a.name.toLowerCase() === mentionName.toLowerCase()
      ) || agents.find(a =>
        a.name.toLowerCase().includes(mentionName.toLowerCase()) ||
        mentionName.toLowerCase().includes(a.name.toLowerCase())
      )
      
      if (agent && !mentionedAgents.find(a => a.pubkey === agent.pubkey)) {
        mentionedAgents.push(agent)
      }
    }
    
    return mentionedAgents
  }, [input, agents])

  return {
    showAgentMenu,
    filteredAgents,
    selectedAgentIndex,
    handleInputChange,
    handleKeyDown,
    insertMention,
    extractMentions,
  }
}