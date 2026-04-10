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
import { type User } from '@/api/schemas'

const adminNav = [
  { title: 'Peers',    url: '/peers',    icon: IconUsers },
  { title: 'Requests', url: '/requests', icon: IconServer },
  { title: 'Firewall', url: '/firewall', icon: IconFlame },
  { title: 'Stats',    url: '/stats',    icon: IconChartBar },
  { title: 'Settings', url: '/settings', icon: IconSettings },
]

const userNav = [
  { title: 'Peers', url: '/peers', icon: IconUsers },
  { title: 'Stats', url: '/stats', icon: IconChartBar },
]

type Props = { user: User } & React.ComponentProps<typeof Sidebar>

export const AppSidebar = ({ user, ...props }: Props) => {
  const nav = user.role === 'admin' ? adminNav : userNav

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]:p-1.5!">
              <IconShieldCheck className="size-5!" />
              <span className="text-base font-semibold">DHD</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={nav} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
