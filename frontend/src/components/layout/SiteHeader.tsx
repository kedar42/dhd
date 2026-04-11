import { IconLogout } from '@tabler/icons-react'
import { useLocation } from 'react-router-dom'
import { Avatar, Burger, Divider, Group, Menu, Text, Title, UnstyledButton } from '@mantine/core'
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

type Props = {
  opened: boolean
  toggle: () => void
}

export const SiteHeader = ({ opened, toggle }: Props) => {
  const { pathname } = useLocation()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const initials = user?.username.slice(0, 2).toUpperCase() ?? ''

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group gap="sm">
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
        <Divider orientation="vertical" hiddenFrom="sm" />
        <Title order={5}>{pageTitle(pathname)}</Title>
      </Group>
      {user && (
        <Menu position="bottom-end" offset={4}>
          <Menu.Target>
            <UnstyledButton>
              <Group gap="xs">
                <Avatar size="sm" radius="sm" color="initials" name={user.username}>
                  {initials}
                </Avatar>
                <Text size="sm" visibleFrom="sm">{user.username}</Text>
              </Group>
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>
              <Text size="sm" fw={500}>{user.username}</Text>
              <Text size="xs" c="dimmed" tt="capitalize">{user.role}</Text>
            </Menu.Label>
            <Menu.Divider />
            <Menu.Item leftSection={<IconLogout size={16} />} onClick={logout}>
              Sign out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      )}
    </Group>
  )
}
