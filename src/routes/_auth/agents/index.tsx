import { createFileRoute } from "@tanstack/react-router";
import { AgentDefinitionsPage } from "@/components/agents/AgentDefinitionsPage";

export const Route = createFileRoute("/_auth/agents/")({
  component: AgentDefinitionsPage,
});
