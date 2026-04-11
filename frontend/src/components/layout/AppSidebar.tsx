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
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { NavMain } from './NavMain'
import { type User } from '@/api/schemas'

const adminNav = [
  { title: 'Tunnels',  url: '/tunnels',    icon: IconUsers },
  { title: 'Requests', url: '/requests', icon: IconServer },
  { title: 'Firewall', url: '/firewall', icon: IconFlame },
  { title: 'Stats',    url: '/stats',    icon: IconChartBar },
  { title: 'Settings', url: '/settings', icon: IconSettings },
]

const userNav = [
  { title: 'Tunnels', url: '/tunnels', icon: IconUsers },
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
            <div className="flex h-12 items-center gap-2 overflow-hidden rounded-md p-1.5 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2!">
              <IconShieldCheck size={20} className="shrink-0" />
              <span className="text-base font-semibold truncate">DHD</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={nav} />
      </SidebarContent>
    </Sidebar>
  )
}
