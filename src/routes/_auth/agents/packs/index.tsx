import { createFileRoute } from '@tanstack/react-router';
import { AgentPacksPage } from '@/components/agents/AgentPacksPage';

export const Route = createFileRoute('/_auth/agents/packs/')({
  component: AgentPacksPage,
});