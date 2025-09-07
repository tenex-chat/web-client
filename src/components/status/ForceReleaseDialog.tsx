import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { useNDK } from '@nostr-dev-kit/ndk-hooks';
import { NDKForceRelease } from '@/lib/ndk-events/NDKForceRelease';
import { useToast } from '@/hooks/use-toast';
import type { NDKProject } from '@/lib/ndk-events/NDKProject';

interface ForceReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: NDKProject;
  conversationId?: string;
}

export function ForceReleaseDialog({ 
  open, 
  onOpenChange, 
  project,
  conversationId 
}: ForceReleaseDialogProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { ndk } = useNDK();
  const { toast } = useToast();

  const handleForceRelease = async () => {
    if (!ndk || !project.dTag) return;

    setIsSubmitting(true);
    try {
      // Create the project reference using the project's method
      const projectReference = project.nip33TagReference();
      if (!projectReference) {
        throw new Error('Project does not have a valid tag reference');
      }
      
      // Create and sign the force release event
      const forceReleaseEvent = NDKForceRelease.create(projectReference, reason || undefined);
      forceReleaseEvent.ndk = ndk;
      
      // Sign and publish the event
      await forceReleaseEvent.sign();
      await forceReleaseEvent.publish();

      toast({
        title: 'Force release initiated',
        description: 'The execution queue has been forcefully released.',
      });

      // Reset and close
      setReason('');
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to force release:', error);
      toast({
        title: 'Force release failed',
        description: 'Failed to publish force release event. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Force Release Execution Queue
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-2">
            <p>
              You are about to forcefully release the execution queue for project{' '}
              <span className="font-semibold">{project.title || 'Untitled'}</span>.
            </p>
            {conversationId && (
              <p className="text-sm">
                This will terminate the active conversation:{' '}
                <code className="bg-muted px-1 py-0.5 rounded text-xs">
                  {conversationId}
                </code>
              </p>
            )}
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-3">
              <p className="text-sm font-medium text-destructive">Warning:</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• The current execution will be immediately terminated</li>
                <li>• Any in-progress work may be lost</li>
                <li>• This action will be recorded in the audit log</li>
                <li>• The next waiting conversation will begin automatically</li>
              </ul>
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason for force release (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Describe why this force release is necessary..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px]"
            />
            <p className="text-xs text-muted-foreground">
              This reason will be included in the audit log for transparency.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleForceRelease}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Releasing...' : 'Force Release'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}