import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ExecutionQueue } from '@/lib/ndk-events/NDKProjectStatus';

interface ExecutionQueueCardProps {
  queue: ExecutionQueue | null;
  onForceRelease?: () => void;
  canForceRelease?: boolean;
}

export function ExecutionQueueCard({ queue, onForceRelease, canForceRelease }: ExecutionQueueCardProps) {
  if (!queue) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Execution Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            No queue information available
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatConversationId = (id: string) => {
    if (id.length > 16) {
      return `${id.slice(0, 8)}...${id.slice(-8)}`;
    }
    return id;
  };

  const calculateElapsedTime = (startTime?: number) => {
    if (!startTime) return 'Unknown';
    const elapsed = Math.floor((Date.now() / 1000) - startTime);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return `${minutes}m ${seconds}s`;
  };

  const estimateWaitTime = (position: number) => {
    // Assuming 30 minute default timeout
    const minutes = position * 30;
    if (minutes < 60) {
      return `~${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `~${hours}h ${remainingMinutes}m` : `~${hours} hours`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Execution Queue
          </div>
          {queue.totalWaiting > 0 && (
            <Badge variant="outline">
              {queue.totalWaiting} waiting
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Execution */}
        {queue.active ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Active Execution
            </div>
            <div className="ml-6 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Conversation: 
                </span>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {formatConversationId(queue.active.conversationId)}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Elapsed Time:
                </span>
                <span className="text-sm">
                  {calculateElapsedTime(queue.active.startTime)}
                </span>
              </div>
              {canForceRelease && (
                <button
                  onClick={onForceRelease}
                  className="mt-2 w-full text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90 px-3 py-1.5 rounded-md transition-colors"
                >
                  Force Release
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            No active execution
          </div>
        )}

        {/* Waiting Queue */}
        {queue.waiting.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-orange-500" />
              Waiting in Queue
            </div>
            <div className="ml-6 space-y-2">
              {queue.waiting.slice(0, 5).map((item, index) => (
                <div key={item.conversationId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      #{item.position || index + 1}
                    </Badge>
                    <code className="text-xs bg-muted px-2 py-0.5 rounded">
                      {formatConversationId(item.conversationId)}
                    </code>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {estimateWaitTime(item.position || index + 1)}
                  </span>
                </div>
              ))}
              {queue.waiting.length > 5 && (
                <div className="text-xs text-muted-foreground text-center mt-2">
                  +{queue.waiting.length - 5} more waiting
                </div>
              )}
            </div>
          </div>
        )}

        {/* Empty Queue */}
        {!queue.active && queue.waiting.length === 0 && (
          <div className="text-center py-4 text-sm text-muted-foreground">
            Queue is empty - ready for new executions
          </div>
        )}
      </CardContent>
    </Card>
  );
}