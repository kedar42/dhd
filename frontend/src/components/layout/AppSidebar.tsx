import {
  IconChartBar,
  IconFlame,
  IconServer,
  IconSettings,
  IconShieldCheck,
  IconUsers,
} from '@tabler/icons-react'
import { Group, Text } from '@mantine/core'
import { NavMain } from './NavMain'
import { type User } from '@/api/schemas'

const adminNav = [
  { title: 'Tunnels',  url: '/tunnels',  icon: IconUsers },
  { title: 'Requests', url: '/requests', icon: IconServer },
  { title: 'Firewall', url: '/firewall', icon: IconFlame },
  { title: 'Stats',    url: '/stats',    icon: IconChartBar },
  { title: 'Settings', url: '/settings', icon: IconSettings },
]

const userNav = [
  { title: 'Tunnels', url: '/tunnels', icon: IconUsers },
  { title: 'Stats',   url: '/stats',   icon: IconChartBar },
]

export const AppSidebar = ({ user }: { user: User }) => {
  const nav = user.role === 'admin' ? adminNav : userNav

  return (
    <>
      <Group gap="xs" p="md" pb="xs">
        <IconShieldCheck size={20} />
        <Text fw={600}>DHD</Text>
      </Group>
      <NavMain items={nav} />
    </>
  )
}
