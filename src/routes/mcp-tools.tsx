import { createFileRoute } from "@tanstack/react-router";
import { MCPToolsPage } from "@/components/mcp/MCPToolsPage";

export const Route = createFileRoute("/mcp-tools")({
  component: MCPToolsPage,
});
