import { createFileRoute } from '@tanstack/react-router';
import { AgentRequestsPage } from '../../../components/agents/AgentRequestsPage';

export const Route = createFileRoute('/_auth/agents/requests')({
  component: AgentRequestsPage,
});