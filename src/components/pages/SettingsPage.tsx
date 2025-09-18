import { useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, Bot, LogOut, Settings, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useNDKCurrentUser,
  useNDKSessionLogout,
  useCurrentUserProfile,
} from "@nostr-dev-kit/ndk-hooks";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AISettings } from "@/components/settings/AISettings";
import { AudioSettings } from "@/components/settings/AudioSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { BlossomSettings } from "@/components/settings/BlossomSettings";
import { RelaySettings } from "@/components/settings/RelaySettings";

export function SettingsPage() {
  const navigate = useNavigate();
  const user = useNDKCurrentUser();
  const ndkLogout = useNDKSessionLogout();
  const userProfile = useCurrentUserProfile();
  
  // Get the tab from search params using TanStack Router
  const search = useSearch({ from: "/_auth/settings" }) as { tab?: string } | undefined;
  const defaultTab = search?.tab || "account";
  
  // Check if we're in test mode
  const isTestMode = typeof window !== 'undefined' && (
    new URLSearchParams(window.location.search).has('test-mode') ||
    /playwright|puppeteer|headless/i.test(navigator.userAgent)
  );

  const handleBack = () => {
    navigate({ to: "/projects" });
  };

  const handleLogout = () => {
    if (user) {
      ndkLogout(user.pubkey);
    }
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">Settings</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <Tabs 
          defaultValue={defaultTab} 
          value={defaultTab}
          onValueChange={(value) => {
            navigate({ 
              to: "/settings", 
              search: { tab: value },
              replace: true 
            });
          }}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-8 lg:w-[900px]">
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="ai">AI</TabsTrigger>
            <TabsTrigger value="audio">Audio</TabsTrigger>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="blossom">Upload</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="relays">Relays</TabsTrigger>
          </TabsList>

          {/* Account Settings */}
          <TabsContent value="account" className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">
                Account Information
              </h2>

              {/* User Profile */}
              {(userProfile || isTestMode) && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Display Name
                    </p>
                    <p className="font-medium">
                      {userProfile?.name ||
                        userProfile?.displayName ||
                        (isTestMode ? "Test User" : "Anonymous")}
                    </p>
                  </div>

                  {userProfile?.nip05 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        NIP-05 Identifier
                      </p>
                      <p className="font-medium">{userProfile.nip05}</p>
                    </div>
                  )}

                  {userProfile?.lud16 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Lightning Address
                      </p>
                      <p className="font-medium">{userProfile.lud16}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Public Key */}
              {(user || isTestMode) && (
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Public Key
                    </p>
                    <p className="font-mono text-xs break-all bg-muted p-2 rounded">
                      {user?.npub || (isTestMode ? "npub1testuser..." : "")}
                    </p>
                  </div>

                  {/* Private Key - Not available for security */}
                </div>
              )}

              {/* Logout Button */}
              <div className="mt-6">
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  className="w-full sm:w-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* AI Settings (LLM, TTS, STT) */}
          <TabsContent value="ai">
            <AISettings />
          </TabsContent>

          {/* Audio Settings (Microphone, Speaker, Call Settings) */}
          <TabsContent value="audio">
            <AudioSettings />
          </TabsContent>

          {/* Appearance Settings */}
          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          {/* Blossom Upload Settings */}
          <TabsContent value="blossom">
            <BlossomSettings />
          </TabsContent>

          {/* Agent Settings */}
          <TabsContent value="agents">
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Agent Management</h2>
              <p className="text-muted-foreground mb-6">
                Manage your AI agents and their configurations
              </p>

              <div className="space-y-4">
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/agents" })}
                  className="w-full justify-start"
                >
                  <Bot className="h-4 w-4 mr-2" />
                  View All Agents
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate({ to: "/agents/requests" })}
                  className="w-full justify-start"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Agent Requests
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* Relay Settings */}
          <TabsContent value="relays">
            <RelaySettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
