import { useMemo, useEffect, useRef } from 'react'
import { useSubscribe } from '@nostr-dev-kit/ndk-hooks'
import { parseKind24133, normalizeProjectA } from '@/lib/ndk-events/operations'
import { useToast } from '@/hooks/use-toast'

/**
 * Component-level hook for event operation status
 * Subscribes to 24133 events for specific project and tracks specific event
 */
export function useEventOperationStatus(eventId?: string, projectId?: string) {
  
  // Normalize project ID for consistent filtering
  const normalizedProjectId = projectId ? normalizeProjectA(projectId) : undefined
  
  // DEBUG: Log subscription setup
  useEffect(() => {
    if (normalizedProjectId && eventId) {
      console.log('DEBUG useEventOperationStatus - Setting up subscription:', {
        eventId: eventId.slice(0, 8),
        projectId: normalizedProjectId,
        filter: {
          kinds: [24133],
          "#a": [normalizedProjectId],
          limit: 0
        }
      })
    }
  }, [normalizedProjectId, eventId])
  // END DEBUG
  
  // Subscribe to kind 24133 with exact filter for this project
  const { events } = useSubscribe(
    normalizedProjectId ? [{
      kinds: [24133],
      "#a": [normalizedProjectId],
      limit: 0 // Live-only telemetry as per requirements
    }] : false,
    { closeOnEose: false }
  )

  // Process events and track status for our specific eventId
  const { isActive, agentCount } = useMemo(() => {
    if (!events || !eventId || !normalizedProjectId) {
      return { isActive: false, agentCount: 0 }
    }

    let latestSnapshot: any = null
    let latestCreatedAt = 0

    // Process all events and find the latest snapshot for our eventId
    events.forEach(event => {
      const snapshot = parseKind24133(event)
      if (!snapshot || snapshot.eId !== eventId) return
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
      return { isActive: false, agentCount: 0 }
    }

    const hasAgents = latestSnapshot.agentPubkeys.length > 0

    return {
      isActive: hasAgents,
      agentCount: latestSnapshot.agentPubkeys.length
    }
  }, [events, eventId, normalizedProjectId])

  // DEBUG: Track state changes and show toasters
  const previousStateRef = useRef<{ isActive: boolean; agentCount: number; eventCount: number }>()
  const { toast } = useToast()
  
  useEffect(() => {
    if (!events || !eventId || !normalizedProjectId) return
    
    // DEBUG: Get detailed snapshot info
    let latestSnapshot: any = null
    let latestCreatedAt = 0
    const relevantEvents: any[] = []
    
    events.forEach(event => {
      const snapshot = parseKind24133(event)
      if (!snapshot || snapshot.eId !== eventId) return
      if (normalizeProjectA(snapshot.projectId) !== normalizedProjectId) return
      
      relevantEvents.push({
        id: event.id?.slice(0, 8),
        createdAt: snapshot.createdAt,
        agentCount: snapshot.agentPubkeys.length,
        agents: snapshot.agentPubkeys.map(pk => pk.slice(0, 8))
      })
      
      if (snapshot.createdAt > latestCreatedAt) {
        latestSnapshot = snapshot
        latestCreatedAt = snapshot.createdAt
      } else if (snapshot.createdAt === latestCreatedAt && snapshot.eventId > (latestSnapshot?.eventId || '')) {
        latestSnapshot = snapshot
      }
    })
    
    const currentEventCount = relevantEvents.length
    
    if (previousStateRef.current !== undefined) {
      const prevActive = previousStateRef.current.isActive
      const prevCount = previousStateRef.current.agentCount
      const prevEventCount = previousStateRef.current.eventCount
      
      // DEBUG: Show state changes
      if (prevActive !== isActive || prevCount !== agentCount || prevEventCount !== currentEventCount) {
        const title = `🔧 DEBUG: Event ${eventId.slice(0, 8)}... State Change`
        let description = ''
        
        if (prevCount !== agentCount) {
          if (agentCount > prevCount) {
            description += `🟢 Agent joined: ${prevCount} → ${agentCount}\n`
          } else {
            description += `🔵 Agent left: ${prevCount} → ${agentCount}\n`
          }
        }
        
        if (prevActive !== isActive) {
          if (isActive) {
            description += `✅ Operation started (${agentCount} agents)\n`
          } else {
            description += `⏹️ Operation stopped (all agents left)\n`
          }
        }
        
        if (prevEventCount !== currentEventCount) {
          description += `📊 24133 events: ${prevEventCount} → ${currentEventCount}\n`
        }
        
        // Add current agents info
        if (latestSnapshot && latestSnapshot.agentPubkeys.length > 0) {
          description += `\n👥 Active agents: ${latestSnapshot.agentPubkeys.map(pk => pk.slice(0, 8)).join(', ')}`
        }
        
        // Add events timeline
        if (relevantEvents.length > 0) {
          description += `\n\n📜 Event timeline (${relevantEvents.length} events):`
          relevantEvents.slice(-3).forEach(ev => {
            description += `\n  • ${ev.id}: ${ev.agentCount} agents`
          })
        }
        
        toast({
          title,
          description,
          duration: 7000,
        })
        
        console.log('DEBUG 24133 Event State Change:', {
          eventId,
          previousState: previousStateRef.current,
          currentState: { isActive, agentCount, eventCount: currentEventCount },
          latestSnapshot,
          relevantEvents,
          allRawEvents: events
        })
      }
    }
    
    previousStateRef.current = { isActive, agentCount, eventCount: currentEventCount }
  }, [events, isActive, agentCount, eventId, normalizedProjectId, toast])
  // END DEBUG

  return { isActive, agentCount }
}