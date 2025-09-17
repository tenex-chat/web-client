import { createFileRoute } from "@tanstack/react-router";
import { InboxPage } from "@/components/inbox/InboxPage";

export const Route = createFileRoute("/_auth/inbox")({
  component: () => {
    console.log('[InboxRoute] Rendering inbox route');
    return <InboxPage />;
  },
});