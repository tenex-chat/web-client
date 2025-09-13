import React, { useState, useCallback, useMemo } from "react";
import type { AgentInstance, ProjectGroup } from "@/types/agent";

interface UseMentionsProps {
  agents: AgentInstance[];
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  messageInput: string;
  setMessageInput: (value: string) => void;
  includeAllProjects?: boolean;
}

export function useMentions({
  agents,
  textareaRef,
  messageInput,
  setMessageInput,
  includeAllProjects = false,
}: UseMentionsProps) {
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [selectedAgentIndex, setSelectedAgentIndex] = useState(0);
  const [mentionSearchTerm, setMentionSearchTerm] = useState("");
  const [mentionStartPosition, setMentionStartPosition] = useState(-1);

  // Filter agents based on search term
  const filteredAgents = useMemo(() => {
    if (!mentionSearchTerm) return agents;

    const searchLower = mentionSearchTerm.toLowerCase();
    return agents.filter((agent) =>
      agent.slug.toLowerCase().includes(searchLower),
    );
  }, [agents, mentionSearchTerm]);

  // Project groups (placeholder for now)
  const filteredProjectGroups: ProjectGroup[] = useMemo(() => {
    if (!includeAllProjects) return [];
    // TODO: Implement project group filtering
    return [];
  }, [includeAllProjects]);

  // Handle input changes to detect mentions
  const handleInputChange = useCallback(
    (value: string) => {
      setMessageInput(value);

      // Check for @ symbol
      const cursorPosition = textareaRef.current?.selectionStart || 0;
      const textBeforeCursor = value.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf("@");

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

        // Check if there's no space between @ and the text
        if (!textAfterAt.includes(" ")) {
          setShowAgentMenu(true);
          setMentionSearchTerm(textAfterAt);
          setMentionStartPosition(lastAtIndex);
          setSelectedAgentIndex(0);
        } else {
          setShowAgentMenu(false);
        }
      } else {
        setShowAgentMenu(false);
      }
    },
    [setMessageInput, textareaRef],
  );

  // Insert mention into text
  const insertMention = useCallback(
    (agent: AgentInstance | ProjectGroup) => {
      if (mentionStartPosition === -1) return;

      const beforeMention = messageInput.slice(0, mentionStartPosition);
      const cursorPosition = textareaRef.current?.selectionStart || 0;
      const afterCursor = messageInput.slice(cursorPosition);

      const slug = "projectName" in agent ? agent.projectName : agent.slug;
      const mentionText = `@${slug} `;
      const newText = beforeMention + mentionText + afterCursor;

      setMessageInput(newText);
      setShowAgentMenu(false);
      setMentionSearchTerm("");
      setMentionStartPosition(-1);

      // Move cursor after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPosition = beforeMention.length + mentionText.length;
          textareaRef.current.selectionStart = newCursorPosition;
          textareaRef.current.selectionEnd = newCursorPosition;
          textareaRef.current.focus();
        }
      }, 0);
    },
    [mentionStartPosition, messageInput, setMessageInput, textareaRef],
  );

  // Handle keyboard navigation in mention menu
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showAgentMenu) return;

      const totalItems = filteredAgents.length + filteredProjectGroups.length;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedAgentIndex((prev) => (prev + 1) % totalItems);
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedAgentIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case "Enter":
        case "Tab":
          e.preventDefault();
          if (selectedAgentIndex < filteredAgents.length) {
            insertMention(filteredAgents[selectedAgentIndex]);
          } else {
            const groupIndex = selectedAgentIndex - filteredAgents.length;
            if (groupIndex < filteredProjectGroups.length) {
              insertMention(filteredProjectGroups[groupIndex]);
            }
          }
          break;
        case "Escape":
          e.preventDefault();
          setShowAgentMenu(false);
          break;
      }
    },
    [
      showAgentMenu,
      filteredAgents,
      filteredProjectGroups,
      selectedAgentIndex,
      insertMention,
    ],
  );

  // Extract mentions from the message
  const extractMentions = useCallback(
    (content?: string) => {
      const mentions: Array<{ pubkey: string; slug: string }> = [];
      const textToSearch = content ?? messageInput; // Use provided content or fallback to messageInput
      const mentionRegex = /@([\w-]+)/g; // Updated to include hyphens in agent slugs
      let match;

      while ((match = mentionRegex.exec(textToSearch)) !== null) {
        const mentionSlug = match[1];

        // Find matching agent - case insensitive comparison
        const agent = agents.find(
          (a) => a.slug.toLowerCase() === mentionSlug.toLowerCase(),
        );
        if (agent) {
          mentions.push({ pubkey: agent.pubkey, slug: agent.slug });
        }

        // Find matching project group - expand to individual agents
        const group = filteredProjectGroups.find(
          (g) => g.projectName.toLowerCase() === mentionSlug.toLowerCase(),
        );
        if (group && group.agents) {
          group.agents.forEach((groupAgent) => {
            mentions.push({ pubkey: groupAgent.pubkey, slug: groupAgent.slug });
          });
        }
      }

      return mentions;
    },
    [messageInput, agents, filteredProjectGroups],
  );

  return useMemo(
    () => ({
      showAgentMenu,
      filteredAgents,
      filteredProjectGroups,
      selectedAgentIndex,
      insertMention,
      handleKeyDown,
      handleInputChange,
      extractMentions,
    }),
    [
      showAgentMenu,
      filteredAgents,
      filteredProjectGroups,
      selectedAgentIndex,
      insertMention,
      handleKeyDown,
      handleInputChange,
      extractMentions,
    ],
  );
}
