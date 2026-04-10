import { useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { Large } from '@/components/ui/typography'

const pageTitle = (pathname: string): string => {
  const segment = pathname.split('/')[1]
  if (!segment) return 'Dashboard'
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

export const SiteHeader = () => {
  const { pathname } = useLocation()

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/90 backdrop-blur-sm">
      <div className="flex items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <Large>{pageTitle(pathname)}</Large>
      </div>
    </header>
  )
}
