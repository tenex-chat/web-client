import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, MessageSquare, Users, Zap, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  enabled: boolean;
  messages: boolean;
  mentions: boolean;
  tasks: boolean;
  agents: boolean;
  soundEnabled: boolean;
  desktopEnabled: boolean;
}

export function NotificationSettings() {
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    messages: true,
    mentions: true,
    tasks: true,
    agents: true,
    soundEnabled: true,
    desktopEnabled: false,
  });

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('notification-preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      }
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = (updates: Partial<NotificationPreferences>) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    localStorage.setItem('notification-preferences', JSON.stringify(newPrefs));
  };

  const requestDesktopPermission = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Desktop notifications are not supported in this browser',
        variant: 'destructive',
      });
      return;
    }

    if (Notification.permission === 'granted') {
      savePreferences({ desktopEnabled: true });
      toast({
        title: 'Enabled',
        description: 'Desktop notifications are already enabled',
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        savePreferences({ desktopEnabled: true });
        toast({
          title: 'Success',
          description: 'Desktop notifications enabled',
        });
        
        // Show a test notification
        new Notification('TENEX', {
          body: 'Desktop notifications are now enabled!',
          icon: '/icon.png',
        });
      } else {
        toast({
          title: 'Permission Denied',
          description: 'You can enable notifications in your browser settings',
          variant: 'destructive',
        });
      }
    }
  };

  const testNotification = () => {
    if (preferences.soundEnabled) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(console.error);
    }

    if (preferences.desktopEnabled && Notification.permission === 'granted') {
      new Notification('Test Notification', {
        body: 'This is a test notification from TENEX',
        icon: '/icon.png',
      });
    }

    toast({
      title: 'Test Notification',
      description: 'This is how notifications will appear',
    });
  };

  return (
    <div className="space-y-6">
      {/* Master Toggle */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {preferences.enabled ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <h3 className="text-lg font-semibold">Notifications</h3>
              <p className="text-sm text-muted-foreground">
                {preferences.enabled ? 'Notifications are enabled' : 'Notifications are disabled'}
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.enabled}
            onCheckedChange={(checked) => savePreferences({ enabled: checked })}
          />
        </div>
      </Card>

      {/* Notification Types */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Types</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="messages">New Messages</Label>
                <p className="text-sm text-muted-foreground">Notify when you receive new messages</p>
              </div>
            </div>
            <Switch
              id="messages"
              checked={preferences.messages}
              onCheckedChange={(checked) => savePreferences({ messages: checked })}
              disabled={!preferences.enabled}
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
              checked={preferences.mentions}
              onCheckedChange={(checked) => savePreferences({ mentions: checked })}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="tasks">Task Updates</Label>
                <p className="text-sm text-muted-foreground">Notify about task assignments and updates</p>
              </div>
            </div>
            <Switch
              id="tasks"
              checked={preferences.tasks}
              onCheckedChange={(checked) => savePreferences({ tasks: checked })}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="agents">Agent Responses</Label>
                <p className="text-sm text-muted-foreground">Notify when agents respond to you</p>
              </div>
            </div>
            <Switch
              id="agents"
              checked={preferences.agents}
              onCheckedChange={(checked) => savePreferences({ agents: checked })}
              disabled={!preferences.enabled}
            />
          </div>
        </div>
      </Card>

      {/* Notification Methods */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Notification Methods</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="sound">Sound</Label>
              <p className="text-sm text-muted-foreground">Play a sound for notifications</p>
            </div>
            <Switch
              id="sound"
              checked={preferences.soundEnabled}
              onCheckedChange={(checked) => savePreferences({ soundEnabled: checked })}
              disabled={!preferences.enabled}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="desktop">Desktop Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Show system notifications
                {preferences.desktopEnabled && Notification.permission === 'granted' && (
                  <span className="text-green-500 ml-2">✓ Enabled</span>
                )}
              </p>
            </div>
            {!preferences.desktopEnabled || Notification.permission !== 'granted' ? (
              <Button
                size="sm"
                onClick={requestDesktopPermission}
                disabled={!preferences.enabled}
              >
                Enable
              </Button>
            ) : (
              <Switch
                id="desktop"
                checked={preferences.desktopEnabled}
                onCheckedChange={(checked) => savePreferences({ desktopEnabled: checked })}
                disabled={!preferences.enabled}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Test Notification */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Test Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Send a test notification to verify your settings
            </p>
          </div>
          <Button
            onClick={testNotification}
            disabled={!preferences.enabled}
          >
            Send Test
          </Button>
        </div>
      </Card>
    </div>
  );
}