import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useNDKCurrentUser } from "@nostr-dev-kit/ndk-hooks";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const user = useNDKCurrentUser();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate({ to: "/projects" });
    } else {
      navigate({ to: "/login" });
    }
  }, [user, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading TENEX...</p>
      </div>
    </div>
  );
}
