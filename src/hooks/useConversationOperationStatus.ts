import { useMemo, useEffect, useRef } from 'react'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { parseKind24133, normalizeProjectA } from '@/lib/ndk-events/operations'
import { useToast } from '@/hooks/use-toast'

/**
 * Component-level hook for conversation operation status
 * Subscribes to 24133 events for specific project and tracks conversation root
 */
export function useConversationOperationStatus(conversationRootId?: string, projectId?: string) {
  
  // Normalize project ID for consistent filtering
  const normalizedProjectId = projectId ? normalizeProjectA(projectId) : undefined
  
  // Subscribe to kind 24133 with exact filter for this project
  const { events } = useSubscribe(
    normalizedProjectId ? [{
      kinds: [24133],
      "#a": [normalizedProjectId],
      limit: 0 // Live-only telemetry as per requirements
    }] : false,
    { closeOnEose: false }
  )

  // Process events and check if conversation has active operations
  const hasActiveOperations = useMemo(() => {
    if (!events || !conversationRootId || !normalizedProjectId) {
      return false
    }

    let latestSnapshot: any = null
    let latestCreatedAt = 0

    // Process all events and find the latest snapshot for our conversationRootId
    events.forEach(event => {
      const snapshot = parseKind24133(event)
      if (!snapshot || snapshot.eId !== conversationRootId) return
      if (normalizeProjectA(snapshot.projectId) !== normalizedProjectId) return

      // Last-write-wins logic
      if (snapshot.createdAt > latestCreatedAt) {
        latestSnapshot = snapshot
        latestCreatedAt = snapshot.createdAt
      } else if (snapshot.createdAt === latestCreatedAt && snapshot.eventId > (latestSnapshot?.eventId || '')) {
        latestSnapshot = snapshot
      }
    })

    if (!latestSnapshot) {
      return false
    }

    const hasAgents = latestSnapshot.agentPubkeys.length > 0

    return hasAgents
  }, [events, conversationRootId, normalizedProjectId])

  // DEBUG: Track state changes and show toasters
  const previousStateRef = useRef<{ hasActiveOperations: boolean; agentCount: number }>()
  const { toast } = useToast()
  
  useEffect(() => {
    if (!events || !conversationRootId || !normalizedProjectId) return
    
    // Find latest snapshot for debugging
    let latestSnapshot: any = null
    let latestCreatedAt = 0
    
    events.forEach(event => {
      const snapshot = parseKind24133(event)
      if (!snapshot || snapshot.eId !== conversationRootId) return
      if (normalizeProjectA(snapshot.projectId) !== normalizedProjectId) return
      
      if (snapshot.createdAt > latestCreatedAt) {
        latestSnapshot = snapshot
        latestCreatedAt = snapshot.createdAt
      } else if (snapshot.createdAt === latestCreatedAt && snapshot.eventId > (latestSnapshot?.eventId || '')) {
        latestSnapshot = snapshot
      }
    })
    
    const currentAgentCount = latestSnapshot?.agentPubkeys?.length || 0
    const currentHasOps = hasActiveOperations
    
    if (previousStateRef.current !== undefined) {
      const prevAgentCount = previousStateRef.current.agentCount
      const prevHasOps = previousStateRef.current.hasActiveOperations
      
      // DEBUG: Show state changes
      if (prevHasOps !== currentHasOps || prevAgentCount !== currentAgentCount) {
        const title = `🔧 DEBUG: Conv ${conversationRootId.slice(0, 8)}... State Change`
        let description = ''
        
        if (prevAgentCount !== currentAgentCount) {
          description += `Agents: ${prevAgentCount} → ${currentAgentCount}\n`
        }
        
        if (prevHasOps !== currentHasOps) {
          description += `Active: ${prevHasOps ? '✅' : '❌'} → ${currentHasOps ? '✅' : '❌'}\n`
        }
        
        if (latestSnapshot) {
          description += `\nAgents: ${latestSnapshot.agentPubkeys.map((pk: string) => pk.slice(0, 8)).join(', ') || 'none'}`
        }
        
        toast({
          title,
          description,
          duration: 5000,
        })
        
        console.log('DEBUG 24133 State Change:', {
          conversationId: conversationRootId,
          previousState: previousStateRef.current,
          currentState: { hasActiveOperations: currentHasOps, agentCount: currentAgentCount },
          latestSnapshot
        })
      }
    }
    
    previousStateRef.current = { 
      hasActiveOperations: currentHasOps, 
      agentCount: currentAgentCount 
    }
  }, [events, hasActiveOperations, conversationRootId, normalizedProjectId, toast])
  // END DEBUG

  return { hasActiveOperations }
}