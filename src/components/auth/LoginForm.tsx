import { useState, useEffect } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useNDKSessionLogin, NDKPrivateKeySigner, NDKNip07Signer } from '@nostr-dev-kit/ndk-hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Key, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function LoginForm() {
  const [nsec, setNsec] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [hasNip07, setHasNip07] = useState(false)
  const ndkLogin = useNDKSessionLogin()
  const navigate = useNavigate()

  // Check if NIP-07 extension is available
  useEffect(() => {
    // Check for window.nostr with a slight delay to allow extensions to load
    const checkNip07 = () => {
      if (typeof window !== 'undefined' && window.nostr) {
        setHasNip07(true)
      }
    }
    
    // Check immediately
    checkNip07()
    
    // Check again after a short delay (some extensions load async)
    const timer = setTimeout(checkNip07, 1000)
    
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!nsec.startsWith('nsec1') || nsec.length < 50) {
      toast.error('Invalid nsec format')
      return
    }

    setIsLoading(true)
    try {
      const signer = new NDKPrivateKeySigner(nsec)
      await ndkLogin(signer)
      toast.success('Successfully logged in!')
      navigate({ to: '/projects' })
    } catch (error) {
      console.error('Login failed:', error)
      toast.error(`Failed to login: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setNsec('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExtensionLogin = async () => {
    if (!hasNip07) {
      toast.error('No Nostr extension detected. Please install Alby, nos2x, or another NIP-07 compatible extension.')
      return
    }

    setIsLoading(true)
    try {
      const signer = new NDKNip07Signer()
      await ndkLogin(signer)
      toast.success('Successfully logged in with extension!')
      navigate({ to: '/projects' })
    } catch (error) {
      console.error('Extension login failed:', error)
      toast.error(`Failed to login with extension: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Welcome to TENEX</CardTitle>
        <CardDescription>
          Login with your Nostr account to continue
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="extension" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="extension" disabled={!hasNip07}>
              <Zap className="mr-2 h-4 w-4" />
              Extension
            </TabsTrigger>
            <TabsTrigger value="nsec">
              <Key className="mr-2 h-4 w-4" />
              Private Key
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="extension" className="space-y-4">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  {hasNip07 
                    ? "Login securely with your browser extension"
                    : "No Nostr extension detected"}
                </p>
                {!hasNip07 && (
                  <p className="text-xs text-muted-foreground">
                    Install <a href="https://getalby.com" target="_blank" rel="noopener noreferrer" className="underline">Alby</a>,{' '}
                    <a href="https://github.com/fiatjaf/nos2x" target="_blank" rel="noopener noreferrer" className="underline">nos2x</a>,{' '}
                    or another NIP-07 extension
                  </p>
                )}
              </div>

              <Button 
                onClick={handleExtensionLogin}
                className="w-full" 
                disabled={isLoading || !hasNip07}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to extension...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Login with Extension
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                Your keys stay in your browser extension
              </p>
            </div>
          </TabsContent>

          <TabsContent value="nsec">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nsec">Private Key (nsec)</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nsec"
                    type="password"
                    placeholder="nsec1..."
                    value={nsec}
                    onChange={(e) => setNsec(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="off"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your private key is stored locally and never sent to any server
                </p>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !nsec}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Login with Private Key
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}