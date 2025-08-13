import { cn } from '@/lib/utils'
import { ProfileDisplay } from '@/components/common/ProfileDisplay'

interface AgentInstance {
  pubkey: string
  name: string
}

interface ChatMentionMenuProps {
  showAgentMenu: boolean
  filteredAgents: AgentInstance[]
  selectedAgentIndex: number
  insertMention: (agent: AgentInstance) => void
}

/**
 * Mention menu component
 * Displays agent suggestions for @mentions
 */
export function ChatMentionMenu({
  showAgentMenu,
  filteredAgents,
  selectedAgentIndex,
  insertMention
}: ChatMentionMenuProps) {
  if (!showAgentMenu || filteredAgents.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg p-2 max-h-48 overflow-y-auto z-50">
      {filteredAgents.map((agent, index) => (
        <button
          key={agent.pubkey}
          className={cn(
            "w-full text-left px-3 py-2 rounded hover:bg-accent transition-colors",
            index === selectedAgentIndex && "bg-accent",
          )}
          onClick={() => insertMention(agent)}
        >
          <div className="flex items-center gap-2">
            <ProfileDisplay
              pubkey={agent.pubkey}
              showName={false}
              avatarClassName="h-6 w-6"
            />
            <span className="text-sm font-medium truncate">
              {agent.name}
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}