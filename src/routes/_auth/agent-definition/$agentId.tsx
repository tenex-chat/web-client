import { createFileRoute } from '@tanstack/react-router';
import { AgentDefinitionDetailPage } from '../../../components/agents/AgentDefinitionDetailPage';

export const Route = createFileRoute('/_auth/agent-definition/$agentId')({
  component: AgentDefinitionDetailPage,
});