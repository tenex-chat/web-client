import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, MessageSquare, Users, Zap, Calendar, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAtom } from 'jotai';
import { notificationSettingsAtom } from '@/stores/ui';

export function NotificationSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useAtom(notificationSettingsAtom);

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    setSettings({ ...settings, [key]: value });
  };

  const testNotification = () => {
    if (settings.soundEnabled) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(console.error);
    }

    toast({
      title: 'Test Notification',
      description: 'This is how notifications will appear',
    });
  };

  return (
    <div className="space-y-6">
      {/* Notification Types */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="projectUpdates">Project Updates</Label>
                <p className="text-sm text-muted-foreground">Notify about project status changes</p>
              </div>
            </div>
            <Switch
              id="projectUpdates"
              checked={settings.projectUpdates}
              onCheckedChange={(checked) => updateSetting('projectUpdates', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="taskAssignments">Task Assignments</Label>
                <p className="text-sm text-muted-foreground">Notify when tasks are assigned to you</p>
              </div>
            </div>
            <Switch
              id="taskAssignments"
              checked={settings.taskAssignments}
              onCheckedChange={(checked) => updateSetting('taskAssignments', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="agentResponses">Agent Responses</Label>
                <p className="text-sm text-muted-foreground">Notify when agents respond</p>
              </div>
            </div>
            <Switch
              id="agentResponses"
              checked={settings.agentResponses}
              onCheckedChange={(checked) => updateSetting('agentResponses', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="threadReplies">Thread Replies</Label>
                <p className="text-sm text-muted-foreground">Notify about new replies in threads</p>
              </div>
            </div>
            <Switch
              id="threadReplies"
              checked={settings.threadReplies}
              onCheckedChange={(checked) => updateSetting('threadReplies', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="mentions">Mentions</Label>
                <p className="text-sm text-muted-foreground">Notify when someone mentions you</p>
              </div>
            </div>
            <Switch
              id="mentions"
              checked={settings.mentions}
              onCheckedChange={(checked) => updateSetting('mentions', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Sound Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Sound Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="soundEnabled">Notification Sounds</Label>
                <p className="text-sm text-muted-foreground">Play sounds for notifications</p>
              </div>
            </div>
            <Switch
              id="soundEnabled"
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
            />
          </div>
        </div>
      </Card>

      {/* Test Notifications */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Test Notifications</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Send a test notification to see how it appears
        </p>
        <Button
          onClick={testNotification}
          className="flex items-center gap-2"
        >
          <Bell className="h-4 w-4" />
          Send Test Notification
        </Button>
      </Card>
    </div>
  );
}