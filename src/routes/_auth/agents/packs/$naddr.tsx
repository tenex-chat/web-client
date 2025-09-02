import { createFileRoute } from '@tanstack/react-router'
import { AgentPackDetailPage } from '@/components/agents/AgentPackDetailPage'

export const Route = createFileRoute('/_auth/agents/packs/$naddr')({
  component: AgentPackDetailPage,
})