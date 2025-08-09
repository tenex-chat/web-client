import { ReactNode, useState } from 'react'
import { useSwipeable } from 'react-swipeable'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { ProjectsSidebar } from './ProjectsSidebar'
import { CollapsibleSidebarWrapper } from './CollapsibleSidebarWrapper'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
  className?: string
}

export function AppShell({ children, className }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const isMobile = useIsMobile()

  // Swipe handlers for mobile
  const handlers = useSwipeable({
    onSwipedRight: () => {
      if (isMobile) setSidebarOpen(true)
    },
    onSwipedLeft: () => {
      if (isMobile) setSidebarOpen(false)
    },
    trackMouse: false,
    trackTouch: true,
  })

  if (isMobile) {
    return (
      <div {...handlers} className={cn("flex flex-col h-screen overflow-hidden", className)}>
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b bg-background px-4 h-14 shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
            <h1 className="text-lg font-semibold">TENEX</h1>
          </div>
        </header>

        {/* Mobile Sheet Sidebar */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] p-0">
            <ProjectsSidebar 
              onProjectSelect={() => setSidebarOpen(false)}
              className="h-full"
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  // Desktop layout with collapsible sidebar
  return (
    <CollapsibleSidebarWrapper className={cn("h-screen overflow-hidden", className)}>
      {children}
    </CollapsibleSidebarWrapper>
  )
}