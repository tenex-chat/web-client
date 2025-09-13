import { createFileRoute } from "@tanstack/react-router";
import { AgentProfilePage } from "@/components/agents/AgentProfilePage";

export const Route = createFileRoute("/_auth/p/$pubkey")({
  component: () => <AgentProfilePage />,
});
