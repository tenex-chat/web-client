import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { NDKProject } from "@/lib/ndk-events/NDKProject";
import { useNDK } from "@nostr-dev-kit/ndk-hooks";

interface ProjectDangerZoneProps {
  project: NDKProject;
  onDelete?: () => void;
}

export function ProjectDangerZone({
  project,
  onDelete,
}: ProjectDangerZoneProps) {
  const navigate = useNavigate();
  const { ndk } = useNDK();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!project || !ndk) return;

    setIsDeleting(true);
    try {
      // Use NDKEvent's built-in delete() method which adds ["deleted"] tag
      await project.delete();

      toast.success("Project deleted successfully");

      // Call onDelete callback if provided
      onDelete?.();

      // Navigate back to projects list if not handled by callback
      if (!onDelete) {
        navigate({ to: "/projects" });
      }
    } catch (error) {
      logger.error("Failed to delete project:", error);
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger Zone</CardTitle>
        <CardDescription>
          These actions cannot be undone. Please be certain.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-medium">Delete Project</h3>
          <p className="text-sm text-muted-foreground">
            Once you delete a project, it will be marked as deleted and hidden
            from your project list. The project data will still exist on the
            Nostr network but will be filtered out.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? "Deleting..." : "Delete Project"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action will mark the project "{project.title}" as
                  deleted. It will be hidden from your project list and cannot
                  be easily recovered. All associated data will remain on the
                  Nostr network but will be filtered out.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete Project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
