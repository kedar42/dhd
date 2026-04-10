import {
  IconChartBar,
  IconFlame,
  IconServer,
  IconSettings,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NavMain } from './NavMain'
import { NavUser } from './NavUser'
import { type User } from '@/stores/auth'

export type Page = 'Peers' | 'Requests' | 'Firewall' | 'Stats' | 'Settings'

const adminNav = [
  { title: 'Peers', icon: IconUsers },
  { title: 'Requests', icon: IconServer },
  { title: 'Firewall', icon: IconFlame },
  { title: 'Stats', icon: IconChartBar },
  { title: 'Settings', icon: IconSettings },
] satisfies { title: Page; icon: typeof IconUsers }[]

const userNav = [
  { title: 'Peers', icon: IconUsers },
  { title: 'Stats', icon: IconChartBar },
] satisfies { title: Page; icon: typeof IconUsers }[]

type Props = {
  user: User
  page: Page
  onNavigate: (p: Page) => void
}

export function AppSidebar({ user, page, onNavigate, ...props }: Props & React.ComponentProps<typeof Sidebar>) {
  const nav = user.role === 'admin' ? adminNav : userNav

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!">
              <IconShieldCheck className="size-5!" />
              <span className="text-base font-semibold">wg-admin</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={nav.map(item => ({
            ...item,
            isActive: page === item.title,
            onClick: () => onNavigate(item.title),
          }))}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
