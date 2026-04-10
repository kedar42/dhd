import { IconLogout } from '@tabler/icons-react'
import { useLocation } from 'react-router-dom'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Large } from '@/components/ui/typography'
import { useAuthStore } from '@/stores/auth'

const routeTitles: Record<string, string> = {
  '': 'Dashboard',
  peers: 'Peers',
  requests: 'Requests',
  firewall: 'Firewall',
  settings: 'Settings',
}

const pageTitle = (pathname: string): string => {
  const segment = pathname.split('/')[1] ?? ''
  return routeTitles[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

export const SiteHeader = () => {
  const { pathname } = useLocation()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const initials = user?.username.slice(0, 2).toUpperCase() ?? ''

  return (
    <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center justify-between border-b bg-background">
      <div className="flex items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 h-4" />
        <Large>{pageTitle(pathname)}</Large>
      </div>
      {user && (
        <div className="px-4 lg:px-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md p-1 hover:bg-accent">
                <Avatar className="size-7 rounded-md">
                  <AvatarFallback className="rounded-md text-xs">{initials}</AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">{user.username}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuLabel className="font-normal">
                <div className="text-sm font-medium">{user.username}</div>
                <div className="text-xs text-muted-foreground capitalize">{user.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <IconLogout />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  )
}
