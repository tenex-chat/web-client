import { createFileRoute } from '@tanstack/react-router';
import { AgentDetailPage } from '../../../components/agents/AgentDetailPage';

export const Route = createFileRoute('/_auth/agents/$agentId')({
  component: AgentDetailPage,
});