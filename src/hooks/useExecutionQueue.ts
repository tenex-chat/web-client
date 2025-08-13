import { useMemo } from 'react';
import { useProjectStatus } from '@/stores/projects';

export function useExecutionQueue(projectDTag: string | undefined) {
  const projectStatus = useProjectStatus(projectDTag);
  
  const queue = useMemo(() => {
    return projectStatus?.executionQueue || null;
  }, [projectStatus?.executionQueue]);

  const queueSummary = useMemo(() => {
    if (!queue) return null;
    
    return {
      hasActiveExecution: !!queue.active,
      activeConversationId: queue.active?.conversationId,
      waitingCount: queue.totalWaiting,
      isIdle: !queue.active && queue.totalWaiting === 0,
      estimatedWaitTime: queue.totalWaiting * 30, // minutes (30 min default timeout)
    };
  }, [queue]);

  return {
    queue,
    ...queueSummary,
  };
}