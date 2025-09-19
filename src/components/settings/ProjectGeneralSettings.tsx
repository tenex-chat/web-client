import { useState, useEffect } from "react";
import { Camera, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProjectAvatar } from "@/components/ui/project-avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";
import { HashtagEditor } from "./HashtagEditor";

interface ProjectGeneralSettingsProps {
  project: NDKProject;
  onSave?: () => void;
}

export function ProjectGeneralSettings({
  project,
  onSave,
}: ProjectGeneralSettingsProps) {
  const { ndk } = useNDK();
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form data state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    picture: "",
    repo: "",
  });
  const [hashtags, setHashtags] = useState<string[]>([]);

  // Initialize form data when project loads
  useEffect(() => {
    if (project) {
      setFormData({
        title: project.title || "",
        description: project.description || "",
        picture: project.picture || "",
        repo: project.repository || "",
      });
      setHashtags(project.hashtags || []);
    }
  }, [project]);

  const handleSave = async () => {
    if (!project || !ndk) return;

    setIsSaving(true);
    try {
      // Update project with new data
      project.title = formData.title;
      project.content = formData.description;
      project.picture = formData.picture;
      project.repository = formData.repo;
      project.hashtags = hashtags;

      // Publish the updated project
      await project.publishReplaceable();

      toast.success("Project settings saved successfully");
      setHasChanges(false);
      onSave?.();
    } catch (error) {
      console.error("Failed to save project:", error);
      toast.error("Failed to save project settings");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | string[],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleHashtagsChange = (newHashtags: string[]) => {
    setHashtags(newHashtags);
    setHasChanges(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Information</CardTitle>
              <CardDescription>
                Update your project's basic information
              </CardDescription>
            </div>
            {hasChanges && (
              <Button onClick={handleSave} disabled={isSaving} size="sm">
                {isSaving ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <ProjectAvatar
              project={project}
              className="h-24 w-24"
              fallbackClassName="text-2xl"
            />
            <div className="space-y-2">
              <Label htmlFor="picture">Project Image URL</Label>
              <div className="flex gap-2">
                <Input
                  id="picture"
                  placeholder="https://example.com/image.png"
                  value={formData.picture}
                  onChange={(e) => handleInputChange("picture", e.target.value)}
                  className="max-w-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const url = prompt("Enter image URL:", formData.picture);
                    if (url !== null) {
                      handleInputChange("picture", url);
                    }
                  }}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <Separator />

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="title">Project Name</Label>
            <Input
              id="title"
              placeholder="Enter project name"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your project..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Repository URL */}
          <div className="space-y-2">
            <Label htmlFor="repo">Repository URL</Label>
            <Input
              id="repo"
              placeholder="https://github.com/username/repo"
              value={formData.repo}
              onChange={(e) => handleInputChange("repo", e.target.value)}
              className="max-w-md"
            />
          </div>

          <Separator />

          {/* Hashtags */}
          <HashtagEditor
            hashtags={hashtags}
            onChange={handleHashtagsChange}
            disabled={isSaving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
