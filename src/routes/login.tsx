import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useNDKCurrentUser, useNDKSessionLogin, NDKPrivateKeySigner } from '@nostr-dev-kit/ndk-hooks'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Key, AlertCircle } from 'lucide-react'
import { TEST_CREDENTIALS } from '@/lib/constants'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  const navigate = useNavigate()
  const user = useNDKCurrentUser()
  const ndkLogin = useNDKSessionLogin()
  const [nsec, setNsec] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate({ to: '/projects' })
    }
  }, [user, navigate])

  // Don't render the form if already authenticated
  if (user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const signer = new NDKPrivateKeySigner(nsec)
      await ndkLogin(signer)
      toast.success('Successfully logged in!')
      navigate({ to: '/projects' })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to login'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // For development, prefill with test nsec
  const handleUseTestKey = () => {
    if (TEST_CREDENTIALS.NSEC) {
      setNsec(TEST_CREDENTIALS.NSEC)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" data-testid="login-screen">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Welcome to TENEX</CardTitle>
          <CardDescription>
            Sign in with your Nostr private key to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nsec">Private Key (nsec)</Label>
              <div className="relative">
                <Input
                  id="nsec"
                  type="password"
                  placeholder="nsec1..."
                  value={nsec}
                  onChange={(e) => setNsec(e.target.value)}
                  disabled={isLoading}
                  data-testid="nsec-input"
                  className="pr-10"
                />
                <Key className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !nsec}
              data-testid="submit-login"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                'Sign In'
              )}
            </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleUseTestKey}
              >
                Use Test Key (Dev Only)
              </Button>
          </form>

          <div className="mt-6 space-y-2 text-center text-sm text-muted-foreground">
            <p>
              Don't have a Nostr key?{' '}
              <a
                href="https://nostr.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Learn more about Nostr
              </a>
            </p>
            <p className="text-xs">
              Your private key is stored locally and never sent to any server
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}