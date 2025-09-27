import { useState, useEffect } from "react";
import { useAtom } from "jotai";
import { Upload, Server, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { blossomServersAtom, serverHealthAtom } from "@/stores/blossomStore";
import { BlossomServerRegistry } from "@/services/blossom/BlossomServerRegistry";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function BlossomSettings() {
  const [servers, setServers] = useAtom(blossomServersAtom);
  const [serverHealth] = useAtom(serverHealthAtom);
  const [newServerUrl, setNewServerUrl] = useState("");
  const [newServerName, setNewServerName] = useState("");
  const [autoCompress, setAutoCompress] = useState(true);
  const [compressionQuality, setCompressionQuality] = useState(85);
  const [stripExif, setStripExif] = useState(true);
  const [maxFileSize, setMaxFileSize] = useState(10); // MB
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const registry = BlossomServerRegistry.getInstance();

  // Sync servers between atom and registry on mount
  useEffect(() => {
    const registryServers = registry.getServers();
    
    // If atom is empty but registry has servers (first load or cleared storage)
    if (servers.length === 0 && registryServers.length > 0) {
      setServers(registryServers);
    } 
    // If atom has servers, ensure they're all in the registry
    else if (servers.length > 0) {
      servers.forEach(server => {
        // Check if server exists in registry
        if (!registry.getServerInfo(server.url)) {
          // Add missing server to registry
          registry.addServer({
            url: server.url,
            name: server.name,
            priority: server.priority,
            capabilities: {
              ...server.capabilities,
              // Ensure supportedMimeTypes is set
              supportedMimeTypes: server.capabilities.supportedMimeTypes || ["*/*"],
            },
          });
        }
      });
      
      // Update atom with the full list from registry (includes defaults)
      const allServers = registry.getServers();
      if (allServers.length !== servers.length) {
        setServers(allServers);
      }
    }
  }, []);

  const addServer = () => {
    if (!newServerUrl || !newServerName) {
      toast.error("Please enter both server URL and name");
      return;
    }

    // Validate URL
    try {
      new URL(newServerUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    // Check if server already exists
    if (servers.some((s) => s.url === newServerUrl)) {
      toast.error("Server already exists");
      return;
    }

    // Add to registry
    registry.addServer({
      url: newServerUrl,
      name: newServerName,
      priority: servers.length + 1,
      capabilities: {
        maxFileSize: 50 * 1024 * 1024, // Default 50MB
        supportedMimeTypes: ["*/*"], // Support all mime types by default
        requiresAuth: true,
        supportedFeatures: [],
      },
    });

    // Get the newly added server from registry (which has full info)
    const newServer = registry.getServers().find((s) => s.url === newServerUrl);
    if (newServer) {
      setServers([...servers, newServer]);
    }

    toast.success(`Added ${newServerName}`);
    setNewServerUrl("");
    setNewServerName("");
  };

  const removeServer = (url: string) => {
    // Update both registry and atom state
    registry.removeServer(url);
    setServers(servers.filter((s) => s.url !== url));
    toast.success("Server removed");
  };

  const testServer = async (url: string) => {
    setIsTesting(url);
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status === 405) {
        toast.success("Server is reachable");
      } else {
        toast.error("Server returned an error");
      }
    } catch {
      toast.error("Failed to reach server");
    } finally {
      setIsTesting(null);
    }
  };

  const getServerStatus = (url: string) => {
    const health = serverHealth.get(url);
    if (!health) return null;

    if (health.isHealthy) {
      return (
        <Badge
          variant="outline"
          className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
        >
          Online
        </Badge>
      );
    } else {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          Offline
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Configuration
          </CardTitle>
          <CardDescription>
            Configure image upload settings and compression options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-file-size">Maximum File Size</Label>
            <div className="flex items-center gap-2">
              <Slider
                id="max-file-size"
                min={1}
                max={100}
                step={1}
                value={[maxFileSize]}
                onValueChange={([value]) => setMaxFileSize(value)}
                className="flex-1"
              />
              <span className="w-16 text-sm text-muted-foreground">
                {maxFileSize} MB
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-compress">Auto Compress Images</Label>
              <p className="text-xs text-muted-foreground">
                Automatically compress large images before upload
              </p>
            </div>
            <Switch
              id="auto-compress"
              checked={autoCompress}
              onCheckedChange={setAutoCompress}
            />
          </div>

          {autoCompress && (
            <div className="space-y-2 pl-4 border-l-2 border-muted">
              <Label htmlFor="compression-quality">Compression Quality</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="compression-quality"
                  min={50}
                  max={100}
                  step={5}
                  value={[compressionQuality]}
                  onValueChange={([value]) => setCompressionQuality(value)}
                  className="flex-1"
                />
                <span className="w-12 text-sm text-muted-foreground">
                  {compressionQuality}%
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="strip-exif">Strip EXIF Data</Label>
              <p className="text-xs text-muted-foreground">
                Remove location and camera metadata from images
              </p>
            </div>
            <Switch
              id="strip-exif"
              checked={stripExif}
              onCheckedChange={setStripExif}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Blossom Servers
          </CardTitle>
          <CardDescription>
            Manage your Blossom protocol servers for image storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing servers */}
          <div className="space-y-2">
            {servers.map((server) => (
              <div
                key={server.url}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{server.name}</p>
                    {getServerStatus(server.url)}
                  </div>
                  <p className="text-xs text-muted-foreground">{server.url}</p>
                  <p className="text-xs text-muted-foreground">
                    Max:{" "}
                    {(server.capabilities.maxFileSize / (1024 * 1024)).toFixed(
                      0,
                    )}{" "}
                    MB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testServer(server.url)}
                    disabled={isTesting === server.url}
                  >
                    {isTesting === server.url ? "Testing..." : "Test"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => removeServer(server.url)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Add new server */}
          <div className="space-y-2 pt-4 border-t">
            <Label>Add Custom Server</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Server URL"
                value={newServerUrl}
                onChange={(e) => setNewServerUrl(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder="Server Name"
                value={newServerName}
                onChange={(e) => setNewServerName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={addServer} size="icon">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
