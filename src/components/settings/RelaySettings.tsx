import React, { useState, useCallback } from 'react';
import { useHashtagRelays } from '@/hooks/useHashtagRelays';
import { useNDK } from '@nostr-dev-kit/ndk-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Trash2, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RelaySettings() {
  const { relays, allRelays, enabled, setEnabled, addRelay, removeRelay } = useHashtagRelays();
  const { ndk } = useNDK();
  const [newRelayUrl, setNewRelayUrl] = useState('');
  const [error, setError] = useState('');

  // Get connection status for each relay
  const getRelayStatus = useCallback((url: string) => {
    if (!ndk?.pool?.relays) return 'unknown';
    const relay = ndk.pool.relays.get(url);
    if (!relay) return 'not-connected';
    
    // Check relay status
    const status = relay.status;
    if (status === 1) return 'connected'; // WebSocket.OPEN
    if (status === 0) return 'connecting'; // WebSocket.CONNECTING
    return 'disconnected';
  }, [ndk]);

  const handleAddRelay = useCallback(() => {
    setError('');
    
    // Validate URL
    if (!newRelayUrl) {
      setError('Please enter a relay URL');
      return;
    }

    if (!newRelayUrl.startsWith('wss://') && !newRelayUrl.startsWith('ws://')) {
      setError('Relay URL must start with wss:// or ws://');
      return;
    }

    // Check if already exists
    if (allRelays.includes(newRelayUrl)) {
      setError('This relay is already in your list');
      return;
    }

    // Add the relay
    addRelay(newRelayUrl);
    setNewRelayUrl('');
  }, [newRelayUrl, allRelays, addRelay]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddRelay();
    }
  }, [handleAddRelay]);

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>Hashtag Events</CardTitle>
          <CardDescription>
            Enable or disable hashtag event streaming from Nostr relays
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="hashtag-enabled">Enable Hashtag Events</Label>
              <p className="text-sm text-muted-foreground">
                Stream events matching your project hashtags
              </p>
            </div>
            <Switch
              id="hashtag-enabled"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Relay List */}
      <Card>
        <CardHeader>
          <CardTitle>Hashtag Relays</CardTitle>
          <CardDescription>
            Configure which relays to use for hashtag event streaming
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Relay */}
          <div className="space-y-2">
            <Label htmlFor="new-relay">Add Relay</Label>
            <div className="flex gap-2">
              <Input
                id="new-relay"
                placeholder="wss://relay.example.com"
                value={newRelayUrl}
                onChange={(e) => setNewRelayUrl(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleAddRelay} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Relay List */}
          <div className="space-y-2">
            <Label>Active Relays</Label>
            {allRelays.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center border rounded-md">
                No relays configured. Add a relay to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {allRelays.map((url) => {
                  const status = getRelayStatus(url);
                  const isActive = enabled && relays.includes(url);
                  
                  return (
                    <div
                      key={url}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-md",
                        !isActive && "opacity-50"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Connection Status Icon */}
                        <div className="shrink-0">
                          {status === 'connected' ? (
                            <Wifi className="h-4 w-4 text-green-500" />
                          ) : status === 'connecting' ? (
                            <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />
                          ) : (
                            <WifiOff className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        
                        {/* Relay URL */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-mono truncate">{url}</p>
                          <p className="text-xs text-muted-foreground">
                            {status === 'connected' ? 'Connected' :
                             status === 'connecting' ? 'Connecting...' :
                             isActive ? 'Disconnected' : 'Not active'}
                          </p>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8"
                        onClick={() => removeRelay(url)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Relays are shared across all features. Adding a relay here makes it available
              to the entire application. The hashtag feature will only query the relays
              listed above when enabled.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}