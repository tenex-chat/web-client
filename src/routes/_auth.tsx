import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useNDKCurrentUser } from '@nostr-dev-kit/ndk-hooks'
import { useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'

export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  const user = useNDKCurrentUser()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate({ to: '/login' })
    }
  }, [user, navigate])

  if (!user) {
    return null
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}