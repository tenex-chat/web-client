import { createFileRoute } from '@tanstack/react-router'
import { SettingsPage } from '@/components/pages/SettingsPage'

export const Route = createFileRoute('/_auth/settings')({
  component: SettingsPage,
})